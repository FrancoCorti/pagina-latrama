import { supabase } from "./supabase-config.js";
import { authReady } from "./admin-guard.js";
import {
    subirImagenProfesional,
    borrarImagen,
    validarArchivoImagen,
    subirCredencial,
    borrarCredencialArchivo,
    validarArchivoCredencial
} from "./admin-storage.js";

const TABLA = "profesionales";

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
    rating: document.getElementById("f_rating"),
    bio: document.getElementById("f_bio"),
    modalidad: document.getElementById("f_modalidad"),
    experiencia: document.getElementById("f_experiencia"),
    whatsapp: document.getElementById("f_whatsapp"),
    email: document.getElementById("f_email"),
    activo: document.getElementById("f_activo"),
    destacado: document.getElementById("f_destacado"),
    vis_badge_destacado: document.getElementById("f_vis_badge_destacado"),
    vis_badge_verificado: document.getElementById("f_vis_badge_verificado"),
    vis_tarjeta_grande: document.getElementById("f_vis_tarjeta_grande"),
    vis_orden_top: document.getElementById("f_vis_orden_top"),
    imagen: document.getElementById("f_imagen"),
    instagram: document.getElementById("f_instagram"),
    facebook: document.getElementById("f_facebook"),
    tiktok: document.getElementById("f_tiktok"),
    youtube: document.getElementById("f_youtube"),
    linkedin: document.getElementById("f_linkedin"),
    sitio_web: document.getElementById("f_sitio_web")
};

let estadoEdicion = null;
let cacheProfesionales = [];
let archivoCortado = null;

// ---- Tag input especialidades ----
const tagContainer = document.getElementById("tagInputEspecialidad");
const tagTextInput = document.getElementById("f_especialidad_input");
let currentTags = [];

function renderTags() {
    tagContainer.querySelectorAll(".tag-chip").forEach(el => el.remove());
    currentTags.forEach((tag, i) => {
        const chip = document.createElement("span");
        chip.className = "tag-chip";
        chip.innerHTML = `${escapeHtml(tag)}<button type="button" aria-label="Quitar ${escapeHtml(tag)}" data-idx="${i}">×</button>`;
        tagContainer.insertBefore(chip, tagTextInput);
    });
}

function addTag(value) {
    const trimmed = value.trim().replace(/,+$/, "").trim();
    if (!trimmed || currentTags.includes(trimmed)) return;
    currentTags.push(trimmed);
    renderTags();
}

function removeTag(index) {
    currentTags.splice(index, 1);
    renderTags();
}

tagTextInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTag(tagTextInput.value);
        tagTextInput.value = "";
    } else if (e.key === "Backspace" && tagTextInput.value === "" && currentTags.length) {
        removeTag(currentTags.length - 1);
    }
});

tagTextInput.addEventListener("blur", () => {
    if (tagTextInput.value.trim()) {
        addTag(tagTextInput.value);
        tagTextInput.value = "";
    }
});

tagContainer.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-idx]");
    if (btn) removeTag(Number(btn.dataset.idx));
});

// ---- Crop modal refs ----
const cropModalEl      = document.getElementById("cropModal");
const cropImageEl      = document.getElementById("cropImage");
const btnConfirmCrop   = document.getElementById("btnConfirmCrop");
const btnCancelCrop    = document.getElementById("btnCancelCrop");
let cropperInstance    = null;

// ---- Credenciales modal refs ----
const credModalEl = document.getElementById("credencialesModal");
const credModalTitleEl = document.getElementById("credencialesModalTitle");
const credListaEl = document.getElementById("credencialesLista");
const credNombreEl = document.getElementById("c_nombre");
const credTipoEl = document.getElementById("c_tipo");
const credArchivoEl = document.getElementById("c_archivo");
const credErrorEl = document.getElementById("credError");
const btnSubirCred = document.getElementById("btnSubirCred");
const btnCerrarCred = document.getElementById("btnCerrarCred");

let credProActual = null;

authReady.then(() => {
    suscribirListado();
    cablearUI();
});

async function cargarListado() {
    const { data, error } = await supabase
        .from(TABLA)
        .select("*")
        .order("nombre");
    if (error) {
        listaEl.innerHTML = `<p class="admin-error">No se pudo cargar el listado: ${error.message}</p>`;
        return;
    }
    cacheProfesionales = data.map(fromDB);
    renderListado();
}

function suscribirListado() {
    cargarListado();
    supabase.channel("profesionales-admin")
        .on("postgres_changes", { event: "*", schema: "public", table: TABLA }, () => {
            cargarListado();
        })
        .subscribe();
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
                    <span class="admin-badge rating">★ ${Number(p.rating || 0).toFixed(1)}</span>
                    ${p.destacado ? '<span class="admin-badge vis-home">Home</span>' : ""}
                    ${p.vis_badge_destacado ? '<span class="admin-badge vis-badge-destacado">Destacado</span>' : ""}
                    ${p.vis_badge_verificado ? '<span class="admin-badge vis-badge-verificado">Verificado</span>' : ""}
                    ${p.vis_tarjeta_grande ? '<span class="admin-badge vis-tarjeta-grande">Tarjeta Grande</span>' : ""}
                    ${p.vis_orden_top != null ? `<span class="admin-badge vis-orden-top">Pos. ${p.vis_orden_top}</span>` : ""}
                </div>
            </div>
            <div class="admin-row-actions">
                <button class="btn-secondary" data-action="credenciales" data-id="${p.id}">Credenciales</button>
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
        if (btn.dataset.action === "credenciales") abrirModalCredenciales(pro);
    });

    // Credenciales modal
    btnCerrarCred.addEventListener("click", cerrarModalCredenciales);
    credModalEl.addEventListener("click", (e) => {
        if (e.target === credModalEl) cerrarModalCredenciales();
    });
    btnSubirCred.addEventListener("click", onSubirCredencial);
    credListaEl.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-cred-action]");
        if (!btn) return;
        if (btn.dataset.credAction === "delete")
            onEliminarCredencial(btn.dataset.credId, btn.dataset.credPath);
    });

    inputs.imagen.addEventListener("change", () => {
        const file = inputs.imagen.files[0];
        if (!file) { previewEl.removeAttribute("src"); previewEl.hidden = true; return; }
        const err = validarArchivoImagen(file);
        if (err) { formErrorEl.textContent = err; inputs.imagen.value = ""; previewEl.hidden = true; return; }
        formErrorEl.textContent = "";
        abrirCropModal(file);
        // preview se actualiza al confirmar el recorte
    });

    btnConfirmCrop.addEventListener("click", confirmarRecorte);
    btnCancelCrop.addEventListener("click", cancelarRecorte);

    formEl.addEventListener("submit", onSubmit);
}

function abrirModal(pro) {
    estadoEdicion = pro;
    formErrorEl.textContent = "";
    formEl.reset();
    previewEl.hidden = true;
    previewEl.removeAttribute("src");

    currentTags = [];
    tagTextInput.value = "";
    renderTags();

    if (pro) {
        modalTitleEl.textContent = "Editar profesional";
        inputs.nombre.value = pro.nombre || "";
        currentTags = (pro.especialidad || "").split(",").map(t => t.trim()).filter(Boolean);
        renderTags();
        inputs.rating.value = pro.rating ?? "";
        inputs.bio.value = pro.bio || "";
        inputs.modalidad.value = pro.modalidad || "";
        inputs.experiencia.value = pro.experiencia || "";
        inputs.whatsapp.value = pro.whatsapp || "";
        inputs.email.value = pro.email || "";
        inputs.activo.checked = pro.activo !== false;
        inputs.destacado.checked = !!pro.destacado;
        inputs.vis_badge_destacado.checked = !!pro.vis_badge_destacado;
        inputs.vis_badge_verificado.checked = !!pro.vis_badge_verificado;
        inputs.vis_tarjeta_grande.checked = !!pro.vis_tarjeta_grande;
        inputs.vis_orden_top.value = pro.vis_orden_top ?? "";
        inputs.instagram.value = pro.instagram || "";
        inputs.facebook.value = pro.facebook || "";
        inputs.tiktok.value = pro.tiktok || "";
        inputs.youtube.value = pro.youtube || "";
        inputs.linkedin.value = pro.linkedin || "";
        inputs.sitio_web.value = pro.sitio_web || "";
        if (pro.img) {
            previewEl.src = pro.img;
            previewEl.hidden = false;
        }
    } else {
        modalTitleEl.textContent = "Nuevo profesional";
        inputs.activo.checked = true;
        inputs.destacado.checked = false;
        inputs.vis_badge_destacado.checked = false;
        inputs.vis_badge_verificado.checked = false;
        inputs.vis_tarjeta_grande.checked = false;
        inputs.vis_orden_top.value = "";
        inputs.rating.value = "5";
    }

    modalEl.hidden = false;
    document.body.style.overflow = "hidden";
    inputs.nombre.focus();
}

function cerrarModal() {
    modalEl.hidden = true;
    estadoEdicion = null;
    archivoCortado = null;
    document.body.style.overflow = "";
}

async function onSubmit(e) {
    e.preventDefault();
    formErrorEl.textContent = "";

    if (tagTextInput.value.trim()) {
        addTag(tagTextInput.value);
        tagTextInput.value = "";
    }
    const datos = leerFormulario();
    if (!datos.nombre || !datos.especialidad) {
        formErrorEl.textContent = "Nombre y especialidad son obligatorios.";
        return;
    }
    if (datos.destacado) {
        const totalDestacados = cacheProfesionales.filter(p =>
            p.destacado && p.id !== estadoEdicion?.id
        ).length;
        if (totalDestacados >= 6) {
            formErrorEl.textContent = "Ya hay 6 profesionales en el Home. Quitá uno antes de agregar otro.";
            return;
        }
    }
    if (datos.vis_orden_top != null) {
        const conflicto = cacheProfesionales.find(p =>
            p.vis_orden_top === datos.vis_orden_top && p.id !== estadoEdicion?.id
        );
        if (conflicto) {
            formErrorEl.textContent = `La posición ${datos.vis_orden_top} ya está asignada a "${conflicto.nombre}". Elegí otro número.`;
            return;
        }
    }
    if (datos.whatsapp && !/^\+\d{7,15}$/.test(datos.whatsapp)) {
        formErrorEl.textContent = "WhatsApp debe tener formato internacional, ej +5493511234567.";
        return;
    }

    const file = archivoCortado || null;

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
        especialidad: currentTags.join(", "),
        rating: Number(inputs.rating.value) || 0,
        bio: inputs.bio.value.trim(),
        modalidad: inputs.modalidad.value.trim(),
        experiencia: inputs.experiencia.value.trim(),
        whatsapp: inputs.whatsapp.value.trim(),
        email: inputs.email.value.trim(),
        activo: inputs.activo.checked,
        destacado: inputs.destacado.checked,
        vis_badge_destacado: inputs.vis_badge_destacado.checked,
        vis_badge_verificado: inputs.vis_badge_verificado.checked,
        vis_tarjeta_grande: inputs.vis_tarjeta_grande.checked,
        vis_orden_top: inputs.vis_orden_top.value !== "" ? Number(inputs.vis_orden_top.value) : null,
        instagram: inputs.instagram.value.trim(),
        facebook: inputs.facebook.value.trim(),
        tiktok: inputs.tiktok.value.trim(),
        youtube: inputs.youtube.value.trim(),
        linkedin: inputs.linkedin.value.trim(),
        sitio_web: inputs.sitio_web.value.trim()
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
    const { error } = await supabase.from(TABLA).insert(toDB({ ...datos, img, imgPath }));
    if (error) throw new Error(error.message);
}

async function guardarEdicion(pro, datos, file) {
    const patch = { ...datos };
    if (file) {
        const { url, path } = await subirImagenProfesional(pro.id, file);
        patch.img = url;
        patch.imgPath = path;
        if (pro.imgPath && pro.imgPath !== path) await borrarImagen(pro.imgPath);
    }
    const { error } = await supabase.from(TABLA).update(toDB(patch)).eq("id", pro.id);
    if (error) throw new Error(error.message);
}

async function eliminarProfesional(pro) {
    const ok = confirm(`¿Eliminar a "${pro.nombre}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    try {
        if (pro.imgPath) await borrarImagen(pro.imgPath);
        const { error } = await supabase.from(TABLA).delete().eq("id", pro.id);
        if (error) throw new Error(error.message);
    } catch (err) {
        console.error(err);
        alert(`No se pudo eliminar: ${err.message}`);
    }
}

function fromDB(row) {
    return { ...row, imgPath: row.img_path };
}

function toDB(obj) {
    const out = { ...obj };
    if ("imgPath" in out) {
        out.img_path = out.imgPath;
        delete out.imgPath;
    }
    return out;
}

// ============================================================
// RECORTADOR DE IMAGEN
// ============================================================

function abrirCropModal(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        cropImageEl.src = ev.target.result;
        cropModalEl.hidden = false;
        document.body.style.overflow = "hidden";
        if (cropperInstance) { cropperInstance.destroy(); cropperInstance = null; }
        cropperInstance = new Cropper(cropImageEl, {
            aspectRatio: 1,
            viewMode: 1,
            dragMode: "move",
            autoCropArea: 0.85,
            cropBoxMovable: false,
            cropBoxResizable: false,
            toggleDragModeOnDblclick: false,
            guides: true,
            highlight: false,
            preview: ".crop-preview-box",
        });
    };
    reader.readAsDataURL(file);
}

function confirmarRecorte() {
    if (!cropperInstance) return;
    btnConfirmCrop.disabled = true;
    btnConfirmCrop.textContent = "Procesando...";
    cropperInstance.getCroppedCanvas({ width: 800, height: 800 }).toBlob((blob) => {
        archivoCortado = new File([blob], "perfil.jpg", { type: "image/jpeg" });
        previewEl.src = URL.createObjectURL(archivoCortado);
        previewEl.hidden = false;
        cerrarCropModal();
        btnConfirmCrop.disabled = false;
        btnConfirmCrop.textContent = "Confirmar recorte";
    }, "image/jpeg", 0.9);
}

function cancelarRecorte() {
    inputs.imagen.value = "";
    archivoCortado = null;
    previewEl.removeAttribute("src");
    previewEl.hidden = true;
    cerrarCropModal();
}

function cerrarCropModal() {
    cropModalEl.hidden = true;
    document.body.style.overflow = "";
    if (cropperInstance) { cropperInstance.destroy(); cropperInstance = null; }
}

// ============================================================
// CREDENCIALES
// ============================================================

function abrirModalCredenciales(pro) {
    credProActual = pro;
    credModalTitleEl.textContent = `Credenciales · ${pro.nombre}`;
    credNombreEl.value = "";
    credTipoEl.value = "Diploma";
    credArchivoEl.value = "";
    credErrorEl.textContent = "";
    credModalEl.hidden = false;
    document.body.style.overflow = "hidden";
    cargarCredenciales(pro.id);
}

function cerrarModalCredenciales() {
    credModalEl.hidden = true;
    credProActual = null;
    document.body.style.overflow = "";
}

async function cargarCredenciales(profesionalId) {
    credListaEl.innerHTML = '<p class="cred-empty">Cargando...</p>';
    const { data, error } = await supabase
        .from("credenciales")
        .select("*")
        .eq("profesional_id", profesionalId)
        .order("created_at");
    if (error) {
        credListaEl.innerHTML = `<p class="admin-error">Error: ${escapeHtml(error.message)}</p>`;
        return;
    }
    if (!data.length) {
        credListaEl.innerHTML = '<p class="cred-empty">Sin credenciales cargadas aún.</p>';
        return;
    }
    credListaEl.innerHTML = data.map(c => `
        <div class="cred-item">
            <div class="cred-item-info">
                <span class="cred-tipo">${escapeHtml(c.tipo)}</span>
                <span class="cred-nombre">${escapeHtml(c.nombre)}</span>
            </div>
            <div class="cred-item-actions">
                <a href="${escapeAttr(c.url)}" target="_blank" rel="noopener" class="btn-secondary cred-btn-ver">Ver</a>
                <button class="btn-danger cred-btn-del"
                    data-cred-action="delete"
                    data-cred-id="${escapeAttr(c.id)}"
                    data-cred-path="${escapeAttr(c.path)}">Borrar</button>
            </div>
        </div>
    `).join("");
}

async function onSubirCredencial() {
    const nombre = credNombreEl.value.trim();
    const tipo = credTipoEl.value;
    const file = credArchivoEl.files[0];
    credErrorEl.textContent = "";

    if (!nombre) { credErrorEl.textContent = "El nombre es obligatorio."; return; }
    if (!file) { credErrorEl.textContent = "Seleccioná un archivo."; return; }
    const errArchivo = validarArchivoCredencial(file);
    if (errArchivo) { credErrorEl.textContent = errArchivo; return; }

    btnSubirCred.disabled = true;
    btnSubirCred.textContent = "Subiendo...";
    try {
        const { url, path } = await subirCredencial(credProActual.id, file);
        const { error } = await supabase.from("credenciales").insert({
            profesional_id: credProActual.id,
            nombre,
            tipo,
            url,
            path
        });
        if (error) throw new Error(error.message);
        credNombreEl.value = "";
        credArchivoEl.value = "";
        await cargarCredenciales(credProActual.id);
    } catch (err) {
        credErrorEl.textContent = `Error: ${err.message}`;
    } finally {
        btnSubirCred.disabled = false;
        btnSubirCred.textContent = "Subir documento";
    }
}

async function onEliminarCredencial(credId, path) {
    if (!confirm("¿Eliminar esta credencial? Esta acción no se puede deshacer.")) return;
    try {
        await borrarCredencialArchivo(path);
        const { error } = await supabase.from("credenciales").delete().eq("id", credId);
        if (error) throw new Error(error.message);
        await cargarCredenciales(credProActual.id);
    } catch (err) {
        credErrorEl.textContent = `Error al eliminar: ${err.message}`;
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
