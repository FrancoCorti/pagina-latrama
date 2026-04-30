/**
 * PULSO CÓSMICO - Lógica Multi-página, Modal, Animaciones y CONEXIÓN A FIRESTORE
 */

import { cargarProfesionalesDesdeFirestore } from "./data-source.js";
import { optimizarUrlCloudinary } from "./admin-storage.js";

const PLACEHOLDER_IMG = "assets/placeholder-profesional.svg";

function srcImg(url, width = 400) {
    return url ? optimizarUrlCloudinary(url, { width }) : PLACEHOLDER_IMG;
}

function parseEspecialidades(str) {
    return (str || '').split(',').map(t => t.trim()).filter(Boolean);
}

// Datos de respaldo (Graceful Degradation) por si Firestore falla
const fallbackProfesionales = [
    { id: 1, nombre: "Marta Gutierrez", especialidad: "Reiki", rating: 4.9, img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80", bio: "Acompaño procesos de sanación profunda...", modalidad: "Online (Zoom)", experiencia: "+7 años" },
    { id: 2, nombre: "Julián Solar", especialidad: "Constelaciones", rating: 4.7, img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500", bio: "Especialista en Constelaciones Familiares...", modalidad: "Online / Presencial", experiencia: "5 años" },
    { id: 3, nombre: "Marta Energética", especialidad: "Reiki", rating: 5.0, img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500", bio: "Maestra Reiki Usui y Karuna...", modalidad: "Presencial", experiencia: "+10 años" }
];

// Variable global donde vivirá nuestra base de datos en memoria
let profesionales = [];

// ==========================================
// 2. INICIALIZACIÓN PRINCIPAL
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    initIntroSplash();
    initScrollAnimations();
    initContactForm();
    initModalEvents();
    initHamburger();

    // Iniciar la carga de datos desde Google Sheets
    await cargarDatosDeBase();
});

function initIntroSplash() {
    const splash = document.getElementById('intro-splash');
    if (!splash) return;
    document.documentElement.classList.add('intro-active');
    setTimeout(() => {
        document.documentElement.classList.remove('intro-active');
        splash.remove();
    }, 5600);
}

// ==========================================
// 3. MOTOR DE DATOS (FETCH A FIRESTORE)
// ==========================================
async function cargarDatosDeBase() {
    try {
        profesionales = await cargarProfesionalesDesdeFirestore();
        iniciarVistas();
    } catch (error) {
        console.error("Error cargando base de datos, usando respaldo.", error);
        profesionales = fallbackProfesionales;
        iniciarVistas();
    }
}

// ==========================================
// 4. CONTROLADORES DE PÁGINAS (VISTAS)
// ==========================================
function iniciarVistas() {
    const pageType = document.body.dataset.page;

    if (pageType === 'home') {
        const homeGrid = document.getElementById('grid-profesionales');
        const destacados = profesionales.filter(p => p.destacado);
        renderizarProfesionales((destacados.length ? destacados : profesionales).slice(0, 6), homeGrid);
    } 
    
    else if (pageType === 'directorio') {
        const fullGrid = document.getElementById('grid-full-profesionales');
        const searchInput = document.getElementById('searchInput');
        const techFilter = document.getElementById('techFilter');
        const sortFilter = document.getElementById('sortFilter');
        const btnReset = document.getElementById('resetFilters');
        const resultsCount = document.getElementById('results-count');

        // Poblar el filtro de especialidades dinámicamente desde los datos reales
        const especialidades = [...new Set(
            profesionales.flatMap(p => parseEspecialidades(p.especialidad))
        )].sort();

        techFilter.innerHTML = '<option value="all">Todas las Técnicas</option>';
        especialidades.forEach(esp => {
            const opt = document.createElement('option');
            opt.value = esp;
            opt.textContent = esp;
            techFilter.appendChild(opt);
        });

        const aplicarFiltrosYOrden = () => {
            const term = searchInput.value.toLowerCase().trim();
            const tech = techFilter.value;
            const sortMode = sortFilter.value;

            let resultado = profesionales.filter(p => {
                const nombre = (p.nombre || '').toLowerCase().trim();
                const tags = parseEspecialidades(p.especialidad);

                const coincideBusqueda = !term || nombre.includes(term) || tags.some(t => t.toLowerCase().includes(term));
                const coincideTecnica = tech === 'all' || tags.includes(tech);
                return coincideBusqueda && coincideTecnica;
            });

            if (sortMode === 'rating-desc') {
                resultado.sort((a, b) => {
                    const destA = a.vis_badge_destacado ? 1 : 0;
                    const destB = b.vis_badge_destacado ? 1 : 0;
                    if (destB !== destA) return destB - destA;
                    return b.rating - a.rating;
                });
            } else if (sortMode === 'name-asc') {
                resultado.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
            } else {
                resultado.sort((a, b) => {
                    const pa = a.vis_orden_top ?? Infinity;
                    const pb = b.vis_orden_top ?? Infinity;
                    return pa - pb;
                });
            }

            renderizarProfesionales(resultado, fullGrid);
            resultsCount.textContent = `Encontramos ${resultado.length} profesionales`;

            const noResults = document.getElementById('no-results');
            if (resultado.length === 0) {
                noResults.classList.remove('hidden');
                fullGrid.classList.add('hidden');
            } else {
                noResults.classList.add('hidden');
                fullGrid.classList.remove('hidden');
            }
        };

        searchInput.addEventListener('input', aplicarFiltrosYOrden);
        techFilter.addEventListener('change', aplicarFiltrosYOrden);
        sortFilter.addEventListener('change', aplicarFiltrosYOrden);

        btnReset.addEventListener('click', () => {
            searchInput.value = '';
            techFilter.value = 'all';
            sortFilter.value = 'default';
            aplicarFiltrosYOrden();
        });

        aplicarFiltrosYOrden();
    }
}

// ==========================================
// 5. RENDERIZADO Y UTILIDADES
// ==========================================
function renderizarProfesionales(lista, contenedor) {
    if (!contenedor) return;
    
    contenedor.innerHTML = lista.map((pro, i) => {
        const esGrande = pro.vis_tarjeta_grande && document.body.dataset.page === 'directorio';
        const src = srcImg(pro.img, 400);
        const imgHTML = esGrande
            ? `<div class="card-img-wrap" style="--card-bg: url('${src}')">
                <img class="card-img-main" src="${src}" alt="Guía ${pro.nombre}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}';this.onerror=null">
               </div>`
            : `<img src="${src}" alt="Guía ${pro.nombre}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}';this.onerror=null">`;
        const badges = [
            pro.vis_badge_destacado ? `<span class="card-vis-badge card-vis-badge--destacado">Destacado</span>` : '',
            pro.vis_badge_verificado ? `<span class="card-vis-badge card-vis-badge--verificado">Verificado</span>` : '',
        ].filter(Boolean).join('');
        return `
        <article class="card reveal${esGrande ? ' card--grande' : ''}" style="transition-delay: ${i * 0.1}s;">
            ${imgHTML}
            ${badges ? `<div class="card-vis-badges">${badges}</div>` : ''}
            <h3>${pro.nombre}</h3>
            <div class="card-tags">
                ${parseEspecialidades(pro.especialidad).map(t => `<span class="card-tag">${t}</span>`).join('')}
            </div>
            <div class="stars">
                ${obtenerEstrellasHTML(pro.rating)}
                <span style="color: var(--text-light); opacity: 0.6; font-size: 0.8rem; margin-left: 5px;">
                    (${pro.rating})
                </span>
            </div>
            <button class="btn-primary" onclick="abrirModal('${pro.id}')" style="margin-top:auto; width:100%; border-radius: 12px; font-size: 0.85rem; padding: 0.8rem;">
                Ver Perfil
            </button>
        </article>
    `;
    }).join('');

    initScrollAnimations();
}

function obtenerEstrellasHTML(rating) {
    const fullStars = Math.floor(rating) || 0;
    const limitStars = fullStars > 5 ? 5 : (fullStars < 0 ? 0 : fullStars);
    return "★".repeat(limitStars) + "☆".repeat(5 - limitStars);
}

const REDES_CONFIG = [
    { key: 'instagram', label: 'Instagram', color: '#E1306C', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>` },
    { key: 'facebook',  label: 'Facebook',  color: '#1877F2', svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>` },
    { key: 'tiktok',    label: 'TikTok',    color: '#ffffff', svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg>` },
    { key: 'youtube',   label: 'YouTube',   color: '#FF0000', svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/></svg>` },
    { key: 'linkedin',  label: 'LinkedIn',  color: '#0A66C2', svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>` },
    { key: 'sitio_web', label: 'Sitio web', color: '#a78bfa', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>` },
];

function construirRedesSociales(pro) {
    const links = REDES_CONFIG.filter(r => pro[r.key]);
    if (!links.length) return '';
    return `
        <div class="modal-redes">
            ${links.map(r => `
                <a href="${pro[r.key]}" target="_blank" rel="noopener" class="modal-red-btn" style="--red-color:${r.color}" title="${r.label}">
                    ${r.svg}
                </a>
            `).join('')}
        </div>`;
}

const WHATSAPP_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
</svg>`;

function construirBotonWhatsapp(pro) {
    const numero = (pro.whatsapp || "").replace(/\D/g, "");
    if (!numero) {
        return `
            <button class="btn-wa btn-wa--disabled" disabled>
                ${WHATSAPP_SVG} Contacto no disponible
            </button>
        `;
    }
    const mensaje = encodeURIComponent(`Hola ${pro.nombre || ""}, vi tu perfil en La Trama y me gustaría reservar un turno.`);
    const url = `https://wa.me/${numero}?text=${mensaje}`;
    return `
        <a href="${url}" target="_blank" rel="noopener" class="btn-wa-link">
            <button class="btn-wa">
                ${WHATSAPP_SVG} Reservar por WhatsApp
            </button>
        </a>
    `;
}

// ==========================================
// 6. ANIMACIONES Y CONTACTO
// ==========================================
function initScrollAnimations() {
    const reveals = document.querySelectorAll('.reveal:not(.active)');
    const observerOptions = { root: null, rootMargin: '0px', threshold: 0.15 };
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    reveals.forEach(reveal => revealObserver.observe(reveal));
}

function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = 'Enviando mensaje...';
            btn.style.opacity = '0.7';
            btn.disabled = true;

            setTimeout(() => {
                btn.textContent = '¡Mensaje Enviado con Éxito!';
                btn.style.background = '#28a745';
                btn.style.opacity = '1';
                contactForm.reset();
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = 'var(--accent-magenta)';
                    btn.disabled = false;
                }, 3000);
            }, 1500);
        });
    }
}

// ==========================================
// 7. LÓGICA DEL MODAL DE PERFIL
// ==========================================
window.abrirModal = function(id) {
    const pro = profesionales.find(p => p.id === id);
    if (!pro) return;

    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <div class="modal-grid">
            <div class="modal-image-container">
                <img src="${srcImg(pro.img, 600)}" alt="${pro.nombre}" class="modal-image" onerror="this.src='${PLACEHOLDER_IMG}';this.onerror=null">
            </div>
            <div class="modal-info">
                <div class="modal-badges">
                    ${parseEspecialidades(pro.especialidad).map(t => `<span class="modal-badge">${t}</span>`).join('')}
                </div>
                <h2 class="modal-title">${pro.nombre}</h2>
                <div class="stars" style="margin-bottom: 1.5rem; font-size: 1.1rem;">
                    ${obtenerEstrellasHTML(pro.rating)} 
                    <span style="color: var(--text-light); opacity: 0.7; margin-left:5px;">(${pro.rating} / 5)</span>
                </div>
                
                <p class="modal-bio">${pro.bio || "Este guía no ha añadido su biografía aún."}</p>
                
                <div class="modal-stats">
                    <div class="stat-item">
                        <h5>Modalidad</h5>
                        <p><i data-lucide="video"></i> ${pro.modalidad || "A convenir"}</p>
                    </div>
                    <div class="stat-item">
                        <h5>Experiencia</h5>
                        <p><i data-lucide="award"></i> ${pro.experiencia || "Certificado"}</p>
                    </div>
                </div>

                ${construirRedesSociales(pro)}
                ${construirBotonWhatsapp(pro)}
                ${pro.credenciales?.length ? `
                <div class="cred-accordion" style="margin-top:0.75rem;">
                    <button class="btn-ver-cred" onclick="toggleCredDropdown(this)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>
                        Credenciales (${pro.credenciales.length})
                        <svg class="cred-chevron" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <div class="cred-accordion-list" hidden>
                        ${pro.credenciales.map(c => {
                            const esPdf = c.url.split('?')[0].toLowerCase().endsWith('.pdf');
                            return `<div class="cred-item-row" onclick="verCredencial('${c.url.replace(/'/g,"\\'")}',${esPdf})">
                                <div class="cred-item-icon">${esPdf ? iconPdf : iconDoc}</div>
                                <div class="cred-item-text">
                                    <span class="cred-item-nombre">${c.nombre}</span>
                                    <span class="cred-item-tipo">${c.tipo}</span>
                                </div>
                                <span class="cred-item-arrow">→</span>
                            </div>`;
                        }).join('')}
                    </div>
                </div>` : ''}
            </div>
        </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();

    const modal = document.getElementById('perfilModal');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.add('active'); }, 10);
    document.body.style.overflow = 'hidden';
}

window.cerrarModal = function() {
    const modal = document.getElementById('perfilModal');
    modal.classList.remove('active');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.style.overflow = ''; 
    }, 300); 
}

function initModalEvents() {
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('perfilModal');
        if (e.target === modal) cerrarModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('perfilModal');
            if (modal.classList.contains('active')) cerrarModal();
        }
    });
}

// ==========================================
// 7. DROPDOWN CREDENCIALES (accordion inline)
// ==========================================

window.toggleCredDropdown = function(btn) {
    const list = btn.nextElementSibling;
    const opening = list.hidden;
    list.hidden = !opening;
    btn.classList.toggle('open', opening);
};

const iconPdf = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
const iconDoc = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`;

function ensureViewerModal() {
    if (document.getElementById('credViewerModal')) return;
    const el = document.createElement('div');
    el.id = 'credViewerModal';
    el.className = 'cred-viewer-overlay hidden';
    el.innerHTML = `
        <button class="cred-viewer-close" onclick="cerrarViewer()" aria-label="Cerrar">✕</button>
        <div class="cred-viewer-inner" id="credViewerInner"></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', (e) => { if (e.target === el) cerrarViewer(); });
}

window.verCredencial = function(url, esPdf) {
    ensureViewerModal();
    const inner = document.getElementById('credViewerInner');
    if (esPdf) {
        inner.innerHTML = `<iframe src="${url}" class="cred-viewer-iframe" title="Documento"></iframe>`;
    } else {
        inner.innerHTML = `<img src="${url}" class="cred-viewer-img" alt="Credencial">`;
    }
    const modal = document.getElementById('credViewerModal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('active'), 10);
};

window.cerrarViewer = function() {
    const modal = document.getElementById('credViewerModal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.getElementById('credViewerInner').innerHTML = '';
    }, 250);
};

// ==========================================
// 8. MENÚ HAMBURGUESA
// ==========================================
function initHamburger() {
    const btn = document.getElementById('hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (!btn || !navLinks) return;

    btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        navLinks.classList.toggle('open');
        document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });

    // Cerrar al hacer click en un link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            btn.classList.remove('active');
            navLinks.classList.remove('open');
            document.body.style.overflow = '';
        });
    });

    // Cerrar al hacer click fuera del menú
    document.addEventListener('click', (e) => {
        if (navLinks.classList.contains('open') && !navLinks.contains(e.target) && e.target !== btn) {
            btn.classList.remove('active');
            navLinks.classList.remove('open');
            document.body.style.overflow = '';
        }
    });
}