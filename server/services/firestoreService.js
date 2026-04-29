/**
 * services/firestoreService.js - Firestore CRUD Abstraction Layer
 * Provides reusable helper functions for reading and writing to
 * VocalIQ's Firestore collections: users, coaching_sessions.
 * Author: Lasya Uma Sri Lingala | CS651 Project 2
 */
const { db } = require("../config/firebase");

/**
 * getDocument - Retrieves a single Firestore document by collection and ID
 * @param {string} collection - Firestore collection name
 * @param {string} docId      - Document ID
 * @returns {Object|null}     - Document data or null if not found
 */
const getDocument = async (collection, docId) => {
  const doc = await db.collection(collection).doc(docId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

/**
 * setDocument - Creates or overwrites a Firestore document
 * @param {string} collection - Firestore collection name
 * @param {string} docId      - Document ID (use generateHash for dedup keys)
 * @param {Object} data       - Data to store
 * @param {boolean} merge     - If true, merges with existing data
 */
const setDocument = async (collection, docId, data, merge = false) => {
  await db.collection(collection).doc(docId).set(data, { merge });
};

/**
 * queryCollection - Queries a collection with a where clause
 * @param {string}      collection   - Firestore collection name
 * @param {string}      field        - Field to filter on
 * @param {string}      value        - Value to match
 * @param {number}      limitNum     - Max documents to return
 * @param {string|null} orderByField - Optional field to order results by
 * @param {string}      orderDir     - "asc" or "desc" (default "desc")
 * @returns {Array}                  - Array of document data objects
 */
const queryCollection = async (collection, field, value, limitNum = 20, orderByField = null, orderDir = "desc") => {
  let ref = db.collection(collection).where(field, "==", value);
  if (orderByField) ref = ref.orderBy(orderByField, orderDir);
  ref = ref.limit(limitNum);
  const snapshot = await ref.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * deleteDocument - Deletes a document from Firestore
 * @param {string} collection - Firestore collection name
 * @param {string} docId      - Document ID to delete
 */
const deleteDocument = async (collection, docId) => {
  await db.collection(collection).doc(docId).delete();
};

module.exports = { getDocument, setDocument, queryCollection, deleteDocument };
