import { db } from "./firebase-config.js";
import { authReady } from "./admin-guard.js";
import {
    subirImagenProfesional,
    borrarImagen,
    validarArchivoImagen
} from "./admin-storage.js";
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const COLECCION = "profesionales";

const listaEl = document.getElementById("profesionalesLista");
const emptyEl = document.getElementById("profesionalesEmpty");
const btnNuevo = document.getElementById("btnNuevo");

const modalEl = document.getElementById("formModal");
const formEl = document.getElementById("profesionalForm");
const modalTitleEl = document.getElementById("formModalTitle");
const formErrorEl = document.getElementById("formError");
const btnCancelar = document.getElementById("btnCancelar");
const btnGuardar = document.getElementById("btnGuardar");
const previewEl = document.getElementById("imgPreview");

const inputs = {
    nombre: document.getElementById("f_nombre"),
    especialidad: document.getElementById("f_especialidad"),
    rating: document.getElementById("f_rating"),
    bio: document.getElementById("f_bio"),
    modalidad: document.getElementById("f_modalidad"),
    experiencia: document.getElementById("f_experiencia"),
    whatsapp: document.getElementById("f_whatsapp"),
    email: document.getElementById("f_email"),
    activo: document.getElementById("f_activo"),
    destacado: document.getElementById("f_destacado"),
    imagen: document.getElementById("f_imagen")
};

let estadoEdicion = null;
let cacheProfesionales = [];

authReady.then(() => {
    suscribirListado();
    cablearUI();
});

function suscribirListado() {
    const q = query(collection(db, COLECCION), orderBy("nombre"));
    onSnapshot(q, (snap) => {
        cacheProfesionales = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderListado();
    }, (err) => {
        console.error("Error escuchando profesionales:", err);
        listaEl.innerHTML = `<p class="admin-error">No se pudo cargar el listado: ${err.message}</p>`;
    });
}

function renderListado() {
    if (!cacheProfesionales.length) {
        listaEl.innerHTML = "";
        emptyEl.hidden = false;
        return;
    }
    emptyEl.hidden = true;
    listaEl.innerHTML = cacheProfesionales.map(p => `
        <article class="admin-row" data-id="${p.id}">
            <img class="admin-row-img" src="${escapeAttr(p.img || "")}" alt="${escapeAttr(p.nombre || "")}" onerror="this.style.visibility='hidden'">
            <div class="admin-row-main">
                <h3>${escapeHtml(p.nombre || "(sin nombre)")}</h3>
                <p class="admin-row-sub">${escapeHtml(p.especialidad || "")} · ${escapeHtml(p.modalidad || "")}</p>
                <div class="admin-badges">
                    <span class="admin-badge ${p.activo ? "on" : "off"}">${p.activo ? "Activo" : "Oculto"}</span>
                    ${p.destacado ? '<span class="admin-badge destacado">Destacado</span>' : ""}
                    <span class="admin-badge rating">★ ${Number(p.rating || 0).toFixed(1)}</span>
                </div>
            </div>
            <div class="admin-row-actions">
                <button class="btn-secondary" data-action="edit" data-id="${p.id}">Editar</button>
                <button class="btn-danger" data-action="delete" data-id="${p.id}">Eliminar</button>
            </div>
        </article>
    `).join("");
}

function cablearUI() {
    btnNuevo.addEventListener("click", () => abrirModal(null));
    btnCancelar.addEventListener("click", cerrarModal);
    modalEl.addEventListener("click", (e) => {
        if (e.target === modalEl) cerrarModal();
    });

    listaEl.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;
        const id = btn.dataset.id;
        const pro = cacheProfesionales.find(p => p.id === id);
        if (!pro) return;
        if (btn.dataset.action === "edit") abrirModal(pro);
        if (btn.dataset.action === "delete") eliminarProfesional(pro);
    });

    inputs.imagen.addEventListener("change", () => {
        const file = inputs.imagen.files[0];
        if (!file) {
            previewEl.removeAttribute("src");
            previewEl.hidden = true;
            return;
        }
        const err = validarArchivoImagen(file);
        if (err) {
            formErrorEl.textContent = err;
            inputs.imagen.value = "";
            previewEl.hidden = true;
            return;
        }
        formErrorEl.textContent = "";
        previewEl.src = URL.createObjectURL(file);
        previewEl.hidden = false;
    });

    formEl.addEventListener("submit", onSubmit);
}

function abrirModal(pro) {
    estadoEdicion = pro;
    formErrorEl.textContent = "";
    formEl.reset();
    previewEl.hidden = true;
    previewEl.removeAttribute("src");

    if (pro) {
        modalTitleEl.textContent = "Editar profesional";
        inputs.nombre.value = pro.nombre || "";
        inputs.especialidad.value = pro.especialidad || "";
        inputs.rating.value = pro.rating ?? "";
        inputs.bio.value = pro.bio || "";
        inputs.modalidad.value = pro.modalidad || "";
        inputs.experiencia.value = pro.experiencia || "";
        inputs.whatsapp.value = pro.whatsapp || "";
        inputs.email.value = pro.email || "";
        inputs.activo.checked = pro.activo !== false;
        inputs.destacado.checked = !!pro.destacado;
        if (pro.img) {
            previewEl.src = pro.img;
            previewEl.hidden = false;
        }
    } else {
        modalTitleEl.textContent = "Nuevo profesional";
        inputs.activo.checked = true;
        inputs.destacado.checked = false;
        inputs.rating.value = "5";
    }

    modalEl.hidden = false;
    document.body.style.overflow = "hidden";
    inputs.nombre.focus();
}

function cerrarModal() {
    modalEl.hidden = true;
    estadoEdicion = null;
    document.body.style.overflow = "";
}

async function onSubmit(e) {
    e.preventDefault();
    formErrorEl.textContent = "";

    const datos = leerFormulario();
    if (!datos.nombre || !datos.especialidad) {
        formErrorEl.textContent = "Nombre y especialidad son obligatorios.";
        return;
    }
    if (datos.whatsapp && !/^\+\d{7,15}$/.test(datos.whatsapp)) {
        formErrorEl.textContent = "WhatsApp debe tener formato internacional, ej +5493511234567.";
        return;
    }

    const file = inputs.imagen.files[0] || null;
    if (file) {
        const errArchivo = validarArchivoImagen(file);
        if (errArchivo) {
            formErrorEl.textContent = errArchivo;
            return;
        }
    }

    btnGuardar.disabled = true;
    btnGuardar.textContent = "Guardando...";

    try {
        if (estadoEdicion) {
            await guardarEdicion(estadoEdicion, datos, file);
        } else {
            await guardarNuevo(datos, file);
        }
        cerrarModal();
    } catch (err) {
        console.error(err);
        formErrorEl.textContent = `No se pudo guardar: ${err.message}`;
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = "Guardar";
    }
}

function leerFormulario() {
    return {
        nombre: inputs.nombre.value.trim(),
        especialidad: inputs.especialidad.value.trim(),
        rating: Number(inputs.rating.value) || 0,
        bio: inputs.bio.value.trim(),
        modalidad: inputs.modalidad.value.trim(),
        experiencia: inputs.experiencia.value.trim(),
        whatsapp: inputs.whatsapp.value.trim(),
        email: inputs.email.value.trim(),
        activo: inputs.activo.checked,
        destacado: inputs.destacado.checked
    };
}

async function guardarNuevo(datos, file) {
    let img = "";
    let imgPath = "";
    if (file) {
        const result = await subirImagenProfesional(null, file);
        img = result.url;
        imgPath = result.path;
    }
    await addDoc(collection(db, COLECCION), {
        ...datos,
        img,
        imgPath,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
}

async function guardarEdicion(pro, datos, file) {
    const docRef = doc(db, COLECCION, pro.id);
    const patch = { ...datos, updatedAt: serverTimestamp() };

    if (file) {
        const { url, path } = await subirImagenProfesional(pro.id, file);
        patch.img = url;
        patch.imgPath = path;
        if (pro.imgPath && pro.imgPath !== path) {
            await borrarImagen(pro.imgPath);
        }
    }
    await updateDoc(docRef, patch);
}

async function eliminarProfesional(pro) {
    const ok = confirm(`¿Eliminar a "${pro.nombre}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    try {
        if (pro.imgPath) await borrarImagen(pro.imgPath);
        await deleteDoc(doc(db, COLECCION, pro.id));
    } catch (err) {
        console.error(err);
        alert(`No se pudo eliminar: ${err.message}`);
    }
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}
function escapeAttr(str) {
    return escapeHtml(str);
}
