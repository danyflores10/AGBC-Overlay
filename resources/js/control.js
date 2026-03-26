import { createApp, ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';

const ControlApp = {
    setup() {
        const config = reactive({
            titulo_evento: '',
            texto_principal: '',
            texto_secundario: '',
            nombre_expositor: '',
            cargo_expositor: '',
            texto_ticker: '',
            bienvenida_titulo: '',
            bienvenida_evento: '',
            bienvenida_subtitulo: '',
            cierre_titulo: '',
            cierre_redes: '',
            receso_titulo: '',
            receso_subtitulo: '',
            receso_minutos: 10,
            mostrar_lower_third: true,
            mostrar_barra_superior: true,
            mostrar_ticker: true,
            mostrar_reloj: true,
            mostrar_en_vivo: true,
            mostrar_camara: false,
            layout_activo: 'bienvenida',
            posicion_camara: 'derecha_abajo',
            camara_device_id: '',
            camara2_device_id: '',
            camara_activa: 1,
            countdown_minutos: 5,
            mostrar_logo: false,
            slide_actual: '',
            slide_camara_device_id: '',
        });

        const camaras = ref([]);
        const guardando = ref(false);
        const cargado = ref(false);
        const mensajeEstado = ref('');
        const slides = ref([]);
        const subiendoSlide = ref(false);
        let debounceTimer = null;

        /* Preview streams para panel de control */
        let preview1Stream = null;
        let preview2Stream = null;
        const preview1Activa = ref(false);
        const preview2Activa = ref(false);
        let lastPreview1Id = '';
        let lastPreview2Id = '';

        const layouts = [
            { value: 'bienvenida', label: 'Bienvenida', svg: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M12 8v4l2 2"/><circle cx="12" cy="12" r="3"/></svg>' },
            { value: 'camara_full', label: 'Cámara Full', svg: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14"/><rect x="1" y="6" width="14" height="12" rx="2"/></svg>' },
            { value: 'diapositivas', label: 'Diapositivas', svg: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M6 8h.01M6 12h4"/></svg>' },
            { value: 'lower_third', label: 'Tercio Inferior', svg: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="22" height="18" rx="2"/><path d="M1 15h22"/><path d="M5 18h8"/></svg>' },
            { value: 'receso', label: 'Receso', svg: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 8h1a4 4 0 110 8h-1"/><path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>' },
            { value: 'cierre', label: 'Cierre', svg: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M9 9l6 6M15 9l-6 6"/></svg>' },
        ];

        const posiciones = [
            { value: 'derecha_abajo', label: 'Abajo Derecha' },
            { value: 'izquierda_abajo', label: 'Abajo Izquierda' },
            { value: 'derecha_arriba', label: 'Arriba Derecha' },
            { value: 'izquierda_arriba', label: 'Arriba Izquierda' },
            { value: 'grande', label: 'Grande Central' },
        ];

        async function detectarCamaras() {
            try {
                const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
                tempStream.getTracks().forEach(t => t.stop());
                const devices = await navigator.mediaDevices.enumerateDevices();
                camaras.value = devices.filter(d => d.kind === 'videoinput').map(d => ({
                    deviceId: d.deviceId,
                    label: d.label || 'Cámara ' + d.deviceId.substring(0, 8),
                }));
            } catch (e) {
                camaras.value = [];
            }
        }

        /* ===== Preview de cámaras en panel de control ===== */
        function detenerPreview1() {
            if (preview1Stream) { preview1Stream.getTracks().forEach(t => t.stop()); preview1Stream = null; }
            preview1Activa.value = false;
        }
        function detenerPreview2() {
            if (preview2Stream) { preview2Stream.getTracks().forEach(t => t.stop()); preview2Stream = null; }
            preview2Activa.value = false;
        }

        async function iniciarPreview1(deviceId) {
            if (!deviceId) { detenerPreview1(); lastPreview1Id = ''; return; }
            if (deviceId === lastPreview1Id && preview1Activa.value) return;
            detenerPreview1();
            try {
                const s = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 360 } },
                    audio: false,
                });
                preview1Stream = s; preview1Activa.value = true; lastPreview1Id = deviceId;
                await nextTick();
                const el = document.getElementById('ctrl-preview-1');
                if (el) el.srcObject = s;
            } catch (e) { preview1Activa.value = false; lastPreview1Id = ''; }
        }

        async function iniciarPreview2(deviceId) {
            if (!deviceId) { detenerPreview2(); lastPreview2Id = ''; return; }
            if (deviceId === lastPreview2Id && preview2Activa.value) return;
            detenerPreview2();
            try {
                const s = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 360 } },
                    audio: false,
                });
                preview2Stream = s; preview2Activa.value = true; lastPreview2Id = deviceId;
                await nextTick();
                const el = document.getElementById('ctrl-preview-2');
                if (el) el.srcObject = s;
            } catch (e) { preview2Activa.value = false; lastPreview2Id = ''; }
        }

        /* Watch para iniciar/detener previews cuando cambian los device IDs */
        watch(() => config.camara_device_id, (val) => {
            if (config.mostrar_camara) iniciarPreview1(val);
            else detenerPreview1();
        });
        watch(() => config.camara2_device_id, (val) => {
            if (config.mostrar_camara) iniciarPreview2(val);
            else detenerPreview2();
        });
        watch(() => config.mostrar_camara, (val) => {
            if (val) {
                if (config.camara_device_id) iniciarPreview1(config.camara_device_id);
                if (config.camara2_device_id) iniciarPreview2(config.camara2_device_id);
            } else {
                detenerPreview1(); detenerPreview2();
            }
        });

        function transicionar() {
            config.camara_activa = config.camara_activa === 1 || config.camara_activa === '1' ? 2 : 1;
            autoGuardar();
        }

        const esCam1Viva = computed(() => config.camara_activa === 1 || config.camara_activa === '1');

        async function cargarConfig() {
            try {
                const res = await fetch('/api/config');
                if (!res.ok) return;
                const data = await res.json();
                Object.assign(config, data);
                if (!config.camara_activa) config.camara_activa = 1;
                cargado.value = true;
            } catch (e) {
                mensajeEstado.value = 'Error al cargar configuración';
            }
        }

        async function guardarConfig() {
            guardando.value = true;
            try {
                const res = await fetch('/api/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...config }),
                });
                if (res.ok) {
                    mensajeEstado.value = 'Guardado ✓';
                    setTimeout(() => { mensajeEstado.value = ''; }, 1500);
                }
            } catch (e) {
                mensajeEstado.value = 'Error al guardar';
            } finally {
                guardando.value = false;
            }
        }

        function autoGuardar() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(guardarConfig, 400);
        }

        async function resetConfig() {
            if (!confirm('¿Restablecer toda la configuración a valores por defecto?')) return;
            try {
                const res = await fetch('/api/config/reset', { method: 'POST' });
                if (res.ok) {
                    const data = await res.json();
                    Object.assign(config, data);
                    mensajeEstado.value = 'Configuración restablecida ✓';
                    setTimeout(() => { mensajeEstado.value = ''; }, 2000);
                }
            } catch (e) {
                mensajeEstado.value = 'Error al restablecer';
            }
        }

        function cambiarLayout(layout) {
            config.layout_activo = layout;
            autoGuardar();
        }

        /* ===== SLIDES ===== */
        async function cargarSlides() {
            try {
                const res = await fetch('/api/slides');
                if (res.ok) { slides.value = await res.json(); }
            } catch (e) { /* silencioso */ }
        }

        async function subirSlide(event) {
            const file = event.target.files[0];
            if (!file) return;
            const esPptx = /\.(pptx?|ppt)$/i.test(file.name);
            subiendoSlide.value = true;
            if (esPptx) mensajeEstado.value = 'Convirtiendo PowerPoint a imágenes…';
            try {
                const fd = new FormData();
                fd.append('slide', file);
                const res = await fetch('/api/slides/upload', { method: 'POST', body: fd });
                const data = await res.json().catch(() => ({}));
                if (res.ok) {
                    await cargarSlides();
                    config.slide_actual = data.url;
                    autoGuardar();
                    const msg = data.total ? data.total + ' diapositiva(s) convertida(s) ✓' : 'Diapositiva subida ✓';
                    mensajeEstado.value = msg;
                    setTimeout(() => { mensajeEstado.value = ''; }, 3000);
                } else {
                    mensajeEstado.value = data.error || 'Error al subir archivo';
                    setTimeout(() => { mensajeEstado.value = ''; }, 6000);
                }
            } catch (e) {
                mensajeEstado.value = 'Error de conexión al subir';
            } finally {
                subiendoSlide.value = false;
                event.target.value = '';
            }
        }

        async function eliminarSlide(filename) {
            if (!confirm('¿Eliminar esta diapositiva?')) return;
            try {
                const res = await fetch('/api/slides/' + encodeURIComponent(filename), { method: 'DELETE' });
                if (res.ok) {
                    await cargarSlides();
                    if (config.slide_actual && config.slide_actual.includes(filename)) {
                        config.slide_actual = '';
                        autoGuardar();
                    }
                    mensajeEstado.value = 'Eliminada ✓';
                    setTimeout(() => { mensajeEstado.value = ''; }, 1500);
                }
            } catch (e) {
                mensajeEstado.value = 'Error al eliminar';
            }
        }

        function seleccionarSlide(url) {
            config.slide_actual = url;
            autoGuardar();
        }

        const layoutLabel = computed(() => {
            const l = layouts.find(x => x.value === config.layout_activo);
            return l ? l.label : '';
        });

        watch(config, () => { if (cargado.value) autoGuardar(); }, { deep: true });

        onMounted(async () => {
            await cargarConfig();
            await detectarCamaras();
            await cargarSlides();
            /* Iniciar previews si hay cámaras configuradas */
            if (config.mostrar_camara && config.camara_device_id) iniciarPreview1(config.camara_device_id);
            if (config.mostrar_camara && config.camara2_device_id) iniciarPreview2(config.camara2_device_id);
        });

        onUnmounted(() => {
            detenerPreview1();
            detenerPreview2();
        });

        return {
            config, camaras, guardando, cargado, mensajeEstado,
            layouts, posiciones, cambiarLayout, layoutLabel, resetConfig,
            detectarCamaras, slides, subiendoSlide, subirSlide,
            eliminarSlide, seleccionarSlide, transicionar,
            preview1Activa, preview2Activa, esCam1Viva,
        };
    },

    template: `
    <div class="ctrl" v-if="cargado">

        <!-- HEADER -->
        <header class="ctrl__header">
            <div class="ctrl__logo">
                <svg viewBox="0 0 60 44" width="38" height="28">
                    <rect x="1" y="1" width="58" height="42" rx="4" fill="#F2C41A" stroke="#1B3A7A" stroke-width="2"/>
                    <polyline points="1,1 30,24 59,1" fill="none" stroke="#1B3A7A" stroke-width="2.5"/>
                    <polygon points="14,6 10,14 14,12 18,14" fill="#E52521"/>
                    <polygon points="18,5 14,13 18,11 22,13" fill="#F2C41A"/>
                    <polygon points="22,4 18,12 22,10 26,12" fill="#009B3A"/>
                </svg>
                <div>
                    <strong>CORREOS DE BOLIVIA</strong>
                    <small>Panel de Control</small>
                </div>
            </div>
            <div class="ctrl__status">
                <transition name="fade"><span v-if="mensajeEstado" class="ctrl__msg">{{ mensajeEstado }}</span></transition>
                <span v-if="guardando" class="ctrl__saving">Guardando…</span>
            </div>
        </header>

        <div class="ctrl__grid">

            <!-- ===== LAYOUTS ===== -->
            <section class="card">
                <h3 class="card__title">Escena Activa</h3>
                <div class="layout-grid">
                    <button v-for="l in layouts" :key="l.value" class="layout-btn" :class="{ active: config.layout_activo === l.value }" @click="cambiarLayout(l.value)">
                        <span class="layout-btn__icon" v-html="l.svg"></span>
                        <span class="layout-btn__label">{{ l.label }}</span>
                    </button>
                </div>
            </section>

            <!-- ===== CÁMARAS — 2 previews con transición ===== -->
            <section class="card card--wide">
                <h3 class="card__title">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14"/><rect x="1" y="6" width="14" height="12" rx="2"/></svg>
                    Cámaras
                </h3>
                <label class="toggle">
                    <input type="checkbox" v-model="config.mostrar_camara" />
                    <span class="toggle__slider"></span>
                    <span class="toggle__text">Mostrar Cámara</span>
                </label>

                <div v-if="config.mostrar_camara" class="cam-panel">
                    <div class="cam-preview-row">
                        <!-- Cámara 1 -->
                        <div class="cam-preview" :class="{ 'cam-preview--live': esCam1Viva }">
                            <div class="cam-preview__screen">
                                <video v-if="preview1Activa" id="ctrl-preview-1" autoplay playsinline muted class="cam-preview__video"></video>
                                <div v-else class="cam-preview__placeholder"><span>Sin señal</span></div>
                                <span class="cam-preview__cam-label">CAM 1</span>
                                <span v-if="esCam1Viva" class="cam-preview__badge cam-preview__badge--live">AL AIRE</span>
                                <span v-else class="cam-preview__badge cam-preview__badge--preview">PREVIEW</span>
                            </div>
                            <select class="cam-preview__select" v-model="config.camara_device_id">
                                <option value="">— Sin cámara —</option>
                                <option v-for="c in camaras" :key="c.deviceId" :value="c.deviceId">{{ c.label }}</option>
                            </select>
                        </div>

                        <!-- Botón TRANSICIÓN -->
                        <div class="cam-transition">
                            <button class="cam-transition__btn" @click="transicionar" title="Intercambiar cámara al aire">
                                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
                            </button>
                        </div>

                        <!-- Cámara 2 -->
                        <div class="cam-preview" :class="{ 'cam-preview--live': !esCam1Viva }">
                            <div class="cam-preview__screen">
                                <video v-if="preview2Activa" id="ctrl-preview-2" autoplay playsinline muted class="cam-preview__video"></video>
                                <div v-else class="cam-preview__placeholder"><span>Sin señal</span></div>
                                <span class="cam-preview__cam-label">CAM 2</span>
                                <span v-if="!esCam1Viva" class="cam-preview__badge cam-preview__badge--live">AL AIRE</span>
                                <span v-else class="cam-preview__badge cam-preview__badge--preview">PREVIEW</span>
                            </div>
                            <select class="cam-preview__select" v-model="config.camara2_device_id">
                                <option value="">— Sin cámara —</option>
                                <option v-for="c in camaras" :key="c.deviceId" :value="c.deviceId">{{ c.label }}</option>
                            </select>
                        </div>
                    </div>

                    <div class="cam-panel__footer">
                        <button class="btn btn--small" @click="detectarCamaras" title="Refrescar cámaras">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
                            Refrescar
                        </button>
                        <div class="field" style="margin:0; flex:1; max-width:220px;">
                            <label>Posición PIP</label>
                            <select v-model="config.posicion_camara">
                                <option v-for="p in posiciones" :key="p.value" :value="p.value">{{ p.label }}</option>
                            </select>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ===== DIAPOSITIVAS ===== -->
            <section class="card card--wide">
                <h3 class="card__title">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                    Diapositivas
                </h3>
                <div class="slides-upload">
                    <label class="btn btn--primary btn--upload">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        {{ subiendoSlide ? 'Procesando…' : 'Subir Diapositiva' }}
                        <input type="file" accept="image/*,.pdf,.pptx,.ppt" @change="subirSlide" style="display:none" :disabled="subiendoSlide" />
                    </label>
                    <small style="color:#9CA3AF;font-size:11px;margin-top:6px;display:block">Soporta: Imágenes (JPG, PNG), PDF y PowerPoint (PPTX).</small>
                </div>
                <div v-if="slides.length" class="slides-grid">
                    <div v-for="s in slides" :key="s.filename" class="slide-thumb" :class="{ 'slide-thumb--active': config.slide_actual === s.url }" @click="seleccionarSlide(s.url)">
                        <img :src="s.url" class="slide-thumb__img" :alt="s.filename" @error="($event.target.style.display='none')" />
                        <div class="slide-thumb__name">{{ s.filename.substring(s.filename.indexOf('_')+1) }}</div>
                        <button class="slide-thumb__del" @click.stop="eliminarSlide(s.filename)" title="Eliminar">&times;</button>
                        <div v-if="config.slide_actual === s.url" class="slide-thumb__check">✓</div>
                    </div>
                </div>
                <div v-else class="card__hint" style="margin-top:12px">No hay diapositivas subidas.</div>

                <div style="margin-top:18px; border-top: 1px solid var(--border); padding-top: 16px;">
                    <div class="field">
                        <label>Cámara en Diapositivas</label>
                        <div class="field__row">
                            <select v-model="config.slide_camara_device_id">
                                <option value="">— Sin cámara —</option>
                                <option v-for="c in camaras" :key="c.deviceId" :value="c.deviceId">{{ c.label }}</option>
                            </select>
                            <button class="btn btn--small" @click="detectarCamaras" title="Refrescar"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg></button>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ===== TEXTOS PRINCIPAL ===== -->
            <section class="card card--wide">
                <h3 class="card__title">Textos de Transmisión</h3>
                <div class="field">
                    <label>Título del Evento (barra superior)</label>
                    <input type="text" v-model="config.titulo_evento" />
                </div>
                <div class="field">
                    <label>Texto Principal (tercio inferior)</label>
                    <input type="text" v-model="config.texto_principal" />
                </div>
                <div class="field">
                    <label>Texto Secundario (tercio inferior)</label>
                    <input type="text" v-model="config.texto_secundario" />
                </div>
                <div class="field-row">
                    <div class="field">
                        <label>Nombre Expositor</label>
                        <input type="text" v-model="config.nombre_expositor" />
                    </div>
                    <div class="field">
                        <label>Cargo Expositor</label>
                        <input type="text" v-model="config.cargo_expositor" />
                    </div>
                </div>
                <div class="field">
                    <label>Texto de la Cinta Informativa</label>
                    <input type="text" v-model="config.texto_ticker" />
                </div>
            </section>

            <!-- ===== BIENVENIDA ===== -->
            <section class="card">
                <h3 class="card__title">Pantalla Bienvenida</h3>
                <div class="field"><label>Título</label><input type="text" v-model="config.bienvenida_titulo" /></div>
                <div class="field"><label>Evento</label><input type="text" v-model="config.bienvenida_evento" /></div>
                <div class="field"><label>Subtítulo</label><input type="text" v-model="config.bienvenida_subtitulo" /></div>
                <div class="field">
                    <label>Cuenta Regresiva (minutos)</label>
                    <input type="number" v-model.number="config.countdown_minutos" min="0" max="120" step="1" />
                    <small style="color:#9CA3AF;font-size:11px;margin-top:4px;display:block">0 = sin cuenta regresiva.</small>
                </div>
            </section>

            <!-- ===== RECESO ===== -->
            <section class="card">
                <h3 class="card__title">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 8h1a4 4 0 110 8h-1"/><path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z"/></svg>
                    Pantalla Receso
                </h3>
                <div class="field"><label>Título</label><input type="text" v-model="config.receso_titulo" /></div>
                <div class="field"><label>Subtítulo</label><input type="text" v-model="config.receso_subtitulo" /></div>
                <div class="field">
                    <label>Tiempo de Receso (minutos)</label>
                    <input type="number" v-model.number="config.receso_minutos" min="0" max="120" step="1" />
                </div>
            </section>

            <!-- ===== CIERRE ===== -->
            <section class="card">
                <h3 class="card__title">Pantalla Cierre</h3>
                <div class="field"><label>Título</label><input type="text" v-model="config.cierre_titulo" /></div>
                <div class="field"><label>Redes</label><input type="text" v-model="config.cierre_redes" /></div>
            </section>

            <!-- ===== TOGGLES ===== -->
            <section class="card">
                <h3 class="card__title">Elementos Visibles</h3>
                <label class="toggle"><input type="checkbox" v-model="config.mostrar_lower_third" /><span class="toggle__slider"></span><span class="toggle__text">Tercio Inferior</span></label>
                <label class="toggle"><input type="checkbox" v-model="config.mostrar_barra_superior" /><span class="toggle__slider"></span><span class="toggle__text">Barra Superior</span></label>
                <label class="toggle"><input type="checkbox" v-model="config.mostrar_ticker" /><span class="toggle__slider"></span><span class="toggle__text">Cinta Informativa</span></label>
                <label class="toggle"><input type="checkbox" v-model="config.mostrar_en_vivo" /><span class="toggle__slider"></span><span class="toggle__text">Indicador EN VIVO</span></label>
                <label class="toggle"><input type="checkbox" v-model="config.mostrar_reloj" /><span class="toggle__slider"></span><span class="toggle__text">Reloj / Fecha</span></label>
                <label class="toggle"><input type="checkbox" v-model="config.mostrar_logo" /><span class="toggle__slider"></span><span class="toggle__text">Logo en Transmisión</span></label>
            </section>

            <!-- ===== ACCIONES ===== -->
            <section class="card">
                <h3 class="card__title">Acciones</h3>
                <div class="card__actions">
                    <a class="btn btn--primary" href="/overlay" target="_blank">Abrir Overlay</a>
                    <button class="btn btn--danger" @click="resetConfig">Restablecer Todo</button>
                </div>
                <p class="card__hint">Abre el overlay en otra pestaña o en OBS como fuente de navegador (1920×1080).</p>
            </section>

        </div>
    </div>

    <div v-else class="ctrl-loading">
        <div class="ctrl-loading__spinner"></div>
        <p>Cargando panel…</p>
    </div>
    `,
};

createApp(ControlApp).mount('#control-app');
