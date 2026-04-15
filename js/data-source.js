import { db } from "./firebase-config.js";
import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export async function cargarProfesionalesDesdeFirestore() {
    const q = query(collection(db, "profesionales"), orderBy("nombre"));
    const snap = await getDocs(q);
    return snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(p => p.activo !== false);
}
