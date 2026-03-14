/**
 * PULSO CÓSMICO - Lógica Multi-página, Modal, Animaciones y CONEXIÓN A GOOGLE SHEETS
 */

// ==========================================
// 1. CONFIGURACIÓN DE GOOGLE SHEETS
// ==========================================
// Pega aquí el link que obtienes en "Archivo > Compartir > Publicar en la web" (formato .csv)
const URL_GOOGLE_SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTh-Mtihak3ol8bn00ieUbItVS6y07w--pFBDTlNsslC4DRVVEG67GAL4A3I1lQvvi_Bm1cXNsvxOHY/pub?output=csv"; 

// Datos de respaldo (Graceful Degradation) por si el Sheet falla o aún no configuras el link
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
    initScrollAnimations();
    initContactForm();
    initModalEvents();
    initHamburger();

    // Iniciar la carga de datos desde Google Sheets
    await cargarDatosDeBase();
});

// ==========================================
// 3. MOTOR DE DATOS (FETCH A GOOGLE SHEETS)
// ==========================================
async function cargarDatosDeBase() {
    try {
        // Si el usuario aún no puso su link, usa el respaldo directamente
        if (URL_GOOGLE_SHEET_CSV === "TU_LINK_DE_GOOGLE_SHEET_AQUI_CSV") {
            console.warn("Aviso: Aún no has configurado tu link de Google Sheets. Usando datos de prueba.");
            profesionales = fallbackProfesionales;
            iniciarVistas();
            return;
        }

        const respuesta = await fetch(URL_GOOGLE_SHEET_CSV);
        if (!respuesta.ok) throw new Error("Error en la red al conectar con Google Sheets");
        
        const textoCSV = await respuesta.text();
        profesionales = csvToJSON(textoCSV);
        console.log("Datos cargados exitosamente de Google Sheets:", profesionales);
        
        iniciarVistas();

    } catch (error) {
        console.error("Error cargando base de datos, usando respaldo.", error);
        profesionales = fallbackProfesionales; // Fallback seguro
        iniciarVistas();
    }
}

// Convertidor ligero y seguro de CSV a Array de Objetos JSON
function csvToJSON(csvStr) {
    const lineas = csvStr.split('\n');
    const resultado = [];
    const encabezados = lineas[0].split(',').map(h => h.trim().toLowerCase());

    for (let i = 1; i < lineas.length; i++) {
        if (!lineas[i].trim()) continue; // Salta líneas vacías
        // Expresión regular para separar por comas pero ignorar comas dentro de comillas
        const lineaActual = lineas[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const obj = {};

        encabezados.forEach((encabezado, index) => {
            let valor = lineaActual[index] ? lineaActual[index].replace(/^"|"$/g, '').trim() : '';
            // Forzar números donde corresponde
            if (encabezado === 'id' || encabezado === 'rating') valor = Number(valor) || 0;
            obj[encabezado] = valor;
        });
        resultado.push(obj);
    }
    return resultado;
}

// ==========================================
// 4. CONTROLADORES DE PÁGINAS (VISTAS)
// ==========================================
function iniciarVistas() {
    const pageType = document.body.dataset.page;

    if (pageType === 'home') {
        const homeGrid = document.getElementById('grid-profesionales');
        renderizarProfesionales(profesionales.slice(0, 3), homeGrid);
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
            profesionales
                .map(p => p.especialidad ? p.especialidad.trim() : '')
                .filter(e => e !== '')
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
                const especialidad = (p.especialidad || '').toLowerCase().trim();

                const coincideBusqueda = !term || nombre.includes(term) || especialidad.includes(term);
                // Comparación normalizada: ignorar espacios extras y mayúsculas
                const coincideTecnica = tech === 'all' || (p.especialidad || '').trim() === tech;
                return coincideBusqueda && coincideTecnica;
            });

            if (sortMode === 'rating-desc') {
                resultado.sort((a, b) => b.rating - a.rating);
            } else if (sortMode === 'name-asc') {
                resultado.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
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
    
    contenedor.innerHTML = lista.map((pro, i) => `
        <article class="card reveal" style="transition-delay: ${i * 0.1}s;">
            <img src="${pro.img}" alt="Guía ${pro.nombre}" loading="lazy">
            <h3>${pro.nombre}</h3>
            <p style="color: #E94560; font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">
                ${pro.especialidad}
            </p>
            <div class="stars">
                ${obtenerEstrellasHTML(pro.rating)} 
                <span style="color: var(--text-light); opacity: 0.6; font-size: 0.8rem; margin-left: 5px;">
                    (${pro.rating})
                </span>
            </div>
            <button class="btn-primary" onclick="abrirModal(${pro.id})" style="margin-top:auto; width:100%; border-radius: 12px; font-size: 0.85rem; padding: 0.8rem;">
                Ver Perfil
            </button>
        </article>
    `).join('');

    initScrollAnimations();
}

function obtenerEstrellasHTML(rating) {
    const fullStars = Math.floor(rating) || 0;
    const limitStars = fullStars > 5 ? 5 : (fullStars < 0 ? 0 : fullStars);
    return "★".repeat(limitStars) + "☆".repeat(5 - limitStars);
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
                <img src="${pro.img}" alt="${pro.nombre}" class="modal-image">
            </div>
            <div class="modal-info">
                <span class="modal-badge">${pro.especialidad}</span>
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

                <a href="https://wa.me/tunumerodetelefono" target="_blank" style="text-decoration:none;">
                    <button class="btn-primary" style="width: 100%; font-size: 1.1rem; padding: 1.2rem; display: flex; justify-content: center; align-items: center; gap: 10px;">
                        <i data-lucide="calendar-check"></i> Reservar Turno
                    </button>
                </a>
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