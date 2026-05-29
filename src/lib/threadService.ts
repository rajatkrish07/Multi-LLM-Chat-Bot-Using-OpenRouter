import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  writeBatch,
  query,
  orderBy
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { ChatThread, Message } from "../types";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  };
  console.error("Firestore Error details:", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function fetchUserThreads(userId: string): Promise<ChatThread[]> {
  const threadsPath = `users/${userId}/threads`;
  try {
    const q = query(collection(db, "users", userId, "threads"), orderBy("created_at", "desc"));
    const snapshot = await getDocs(q);
    const threads: ChatThread[] = [];

    for (const threadDoc of snapshot.docs) {
      const data = threadDoc.data();
      
      // Load subcollection messages for each thread
      const messagesPath = `users/${userId}/threads/${threadDoc.id}/messages`;
      const msgSnapshot = await getDocs(query(collection(db, "users", userId, "threads", threadDoc.id, "messages"), orderBy("timestamp", "asc")));
      const messages: Message[] = msgSnapshot.docs.map(mDoc => {
        const mData = mDoc.data();
        return {
          id: mData.id,
          role: mData.role,
          content: mData.content,
          timestamp: mData.timestamp?.toDate ? mData.timestamp.toDate() : new Date(mData.timestamp),
          modelUsed: mData.modelUsed || undefined,
          isStreaming: mData.isStreaming || false,
          error: mData.error || false,
          fallbacked: mData.fallbacked || false,
          originalModel: mData.originalModel || undefined
        };
      });

      threads.push({
        id: threadDoc.id,
        title: data.title || "Untitled Conversation",
        messages,
        created_at: data.created_at?.toDate ? data.created_at.toDate() : new Date(data.created_at)
      });
    }

    return threads;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, threadsPath);
    return [];
  }
}

export async function saveThreadMeta(userId: string, threadId: string, title: string, createdAt: Date): Promise<void> {
  const path = `users/${userId}/threads/${threadId}`;
  try {
    await setDoc(doc(db, "users", userId, "threads", threadId), {
      id: threadId,
      title: title,
      created_at: createdAt,
      userId: userId
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveChatMessage(userId: string, threadId: string, message: Message): Promise<void> {
  const path = `users/${userId}/threads/${threadId}/messages/${message.id}`;
  try {
    await setDoc(doc(db, "users", userId, "threads", threadId, "messages", message.id), {
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      modelUsed: message.modelUsed || null,
      isStreaming: message.isStreaming || false,
      error: message.error || false,
      fallbacked: message.fallbacked || false,
      originalModel: message.originalModel || null
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteThreadFromFirestore(userId: string, threadId: string): Promise<void> {
  const path = `users/${userId}/threads/${threadId}`;
  try {
    // Delete subcollection messages first
    const messagesPath = `users/${userId}/threads/${threadId}/messages`;
    const msgSnapshot = await getDocs(collection(db, "users", userId, "threads", threadId, "messages"));
    const batch = writeBatch(db);
    
    msgSnapshot.docs.forEach((mDoc) => {
      batch.delete(mDoc.ref);
    });
    
    // Delete thread document
    batch.delete(doc(db, "users", userId, "threads", threadId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
