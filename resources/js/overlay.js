import { createApp, ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';

const OverlayApp = {
    setup() {
        const config = reactive({
            titulo_evento: 'RENDICIÓN PÚBLICA DE CUENTAS FINAL 2025',
            texto_principal: 'RENDICIÓN PÚBLICA DE CUENTAS FINAL 2025',
            texto_secundario: 'En Correos de Bolivia, la eficiencia es nuestra prioridad',
            nombre_expositor: 'Correos de Bolivia',
            cargo_expositor: 'Dirección General Ejecutiva',
            texto_ticker: 'Bienvenidos a la transmisión oficial de la Agencia Boliviana de Correos',
            bienvenida_titulo: 'En breve comenzamos',
            bienvenida_evento: 'Correos de Bolivia',
            bienvenida_subtitulo: 'Transmisión Institucional en Vivo',
            cierre_titulo: 'Gracias por acompañarnos',
            cierre_redes: 'Facebook: /CorreosBolivia | www.correosbolivia.gob.bo',
            receso_titulo: 'Estamos en receso',
            receso_subtitulo: 'Volvemos en breve',
            receso_minutos: 10,
            mostrar_lower_third: true,
            mostrar_barra_superior: true,
            mostrar_ticker: true,
            mostrar_reloj: true,
            mostrar_en_vivo: true,
            mostrar_camara: true,
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

        const reloj = ref('');
        const fecha = ref('');
        const loaded = ref(false);
        const cam1Activa = ref(false);
        const cam2Activa = ref(false);
        const slideCamaraActiva = ref(false);
        const isFullscreen = ref(false);
        const countdownText = ref('');
        const recesoCountdownText = ref('');
        const enTransicion = ref(false);
        let pollInterval = null;
        let stream1 = null;
        let stream2 = null;
        let slideStream = null;
        let lastDevice1 = '';
        let lastDevice2 = '';
        let lastSlideDeviceId = '';
        let countdownEnd = 0;
        let recesoCountdownEnd = 0;
        let prevCamaraActiva = 1;

        const audioRef = ref(null);

        function actualizarReloj() {
            const now = new Date();
            reloj.value = now.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            fecha.value = now.toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            fecha.value = fecha.value.charAt(0).toUpperCase() + fecha.value.slice(1);
            if (countdownEnd > 0) {
                const diff = Math.max(0, Math.floor((countdownEnd - Date.now()) / 1000));
                if (diff <= 0) { countdownText.value = '00:00'; }
                else {
                    const m = String(Math.floor(diff / 60)).padStart(2, '0');
                    const s = String(diff % 60).padStart(2, '0');
                    countdownText.value = m + ':' + s;
                }
            }
            if (recesoCountdownEnd > 0) {
                const diff = Math.max(0, Math.floor((recesoCountdownEnd - Date.now()) / 1000));
                if (diff <= 0) { recesoCountdownText.value = '00:00'; }
                else {
                    const m = String(Math.floor(diff / 60)).padStart(2, '0');
                    const s = String(diff % 60).padStart(2, '0');
                    recesoCountdownText.value = m + ':' + s;
                }
            }
        }

        /* ===== Cámara 1 ===== */
        function detenerCam1() {
            if (stream1) { stream1.getTracks().forEach(t => t.stop()); stream1 = null; }
            cam1Activa.value = false;
        }
        async function iniciarCam1(deviceId) {
            if (!deviceId) { detenerCam1(); return; }
            if (deviceId === lastDevice1 && cam1Activa.value) return;
            detenerCam1();
            try {
                const s = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } },
                    audio: true,
                });
                stream1 = s; cam1Activa.value = true; lastDevice1 = deviceId;
                await nextTick();
                const el = document.getElementById('overlay-cam1');
                if (el) el.srcObject = s;
                const pip = document.getElementById('overlay-cam1-pip');
                if (pip) pip.srcObject = s;
            } catch (e) { cam1Activa.value = false; lastDevice1 = ''; }
        }

        /* ===== Cámara 2 ===== */
        function detenerCam2() {
            if (stream2) { stream2.getTracks().forEach(t => t.stop()); stream2 = null; }
            cam2Activa.value = false;
        }
        async function iniciarCam2(deviceId) {
            if (!deviceId) { detenerCam2(); return; }
            if (deviceId === lastDevice2 && cam2Activa.value) return;
            detenerCam2();
            try {
                const s = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } },
                    audio: false,
                });
                stream2 = s; cam2Activa.value = true; lastDevice2 = deviceId;
                await nextTick();
                const el = document.getElementById('overlay-cam2');
                if (el) el.srcObject = s;
                const pip = document.getElementById('overlay-cam2-pip');
                if (pip) pip.srcObject = s;
            } catch (e) { cam2Activa.value = false; lastDevice2 = ''; }
        }

        /* ===== Cámara Diapositivas ===== */
        function detenerSlideCamara() {
            if (slideStream) { slideStream.getTracks().forEach(t => t.stop()); slideStream = null; }
            slideCamaraActiva.value = false;
        }
        async function iniciarSlideCamara(deviceId) {
            if (!deviceId) { detenerSlideCamara(); return; }
            if (deviceId === lastSlideDeviceId && slideCamaraActiva.value) return;
            detenerSlideCamara();
            try {
                const s = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false,
                });
                slideStream = s; slideCamaraActiva.value = true; lastSlideDeviceId = deviceId;
                await nextTick();
                const v = document.getElementById('slide-cam');
                if (v) v.srcObject = s;
            } catch (e) { slideCamaraActiva.value = false; lastSlideDeviceId = ''; }
        }

        /* Transición suave entre cámaras */
        function hacerTransicion() {
            enTransicion.value = true;
            setTimeout(() => { enTransicion.value = false; }, 800);
        }

        /* Audio */
        function gestionarAudio(layout) {
            const el = audioRef.value || document.getElementById('bg-audio');
            if (!el) return;
            const debesonar = (layout === 'bienvenida' || layout === 'receso' || layout === 'cierre');
            if (debesonar) { if (el.paused) el.play().catch(() => {}); }
            else { if (!el.paused) el.pause(); }
        }

        async function cargarConfig() {
            try {
                const res = await fetch('/api/config');
                if (!res.ok) return;
                const data = await res.json();
                const prevDev1 = config.camara_device_id;
                const prevDev2 = config.camara2_device_id;
                const prevShow = config.mostrar_camara;
                const prevSlideDevice = config.slide_camara_device_id;
                const prevCamActiva = config.camara_activa;
                Object.assign(config, data);
                if (!config.camara_activa) config.camara_activa = 1;
                checkFullscreen(config.layout_activo);

                if (config.layout_activo === 'bienvenida' && countdownEnd === 0 && config.countdown_minutos > 0) {
                    countdownEnd = Date.now() + config.countdown_minutos * 60 * 1000;
                } else if (config.layout_activo !== 'bienvenida') { countdownEnd = 0; countdownText.value = ''; }

                if (config.layout_activo === 'receso' && recesoCountdownEnd === 0 && config.receso_minutos > 0) {
                    recesoCountdownEnd = Date.now() + config.receso_minutos * 60 * 1000;
                } else if (config.layout_activo !== 'receso') { recesoCountdownEnd = 0; recesoCountdownText.value = ''; }

                /* Cámara 1 */
                if (config.mostrar_camara && config.camara_device_id && (config.camara_device_id !== prevDev1 || config.mostrar_camara !== prevShow)) {
                    await iniciarCam1(config.camara_device_id);
                } else if (!config.mostrar_camara && prevShow) { detenerCam1(); }

                /* Cámara 2 */
                if (config.mostrar_camara && config.camara2_device_id && (config.camara2_device_id !== prevDev2 || config.mostrar_camara !== prevShow)) {
                    await iniciarCam2(config.camara2_device_id);
                } else if (!config.mostrar_camara && prevShow) { detenerCam2(); }
                if (!config.camara2_device_id && prevDev2) { detenerCam2(); }

                /* Transición si cambió la cámara activa */
                if (config.camara_activa !== prevCamActiva && prevCamActiva) {
                    hacerTransicion();
                    prevCamaraActiva = config.camara_activa;
                }

                /* Cámara de diapositivas */
                if (config.slide_camara_device_id && config.slide_camara_device_id !== prevSlideDevice) {
                    await iniciarSlideCamara(config.slide_camara_device_id);
                } else if (!config.slide_camara_device_id && prevSlideDevice) { detenerSlideCamara(); }

                gestionarAudio(config.layout_activo);
            } catch (e) { /* silencioso */ }
        }

        function toggleFullscreen() {
            if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
            else document.documentElement.requestFullscreen?.().catch(() => {});
        }
        function onFullscreenChange() { isFullscreen.value = !!document.fullscreenElement; }

        let prevLayoutFS = '';
        function checkFullscreen(layout) {
            if (layout === 'camara_full' && prevLayoutFS !== 'camara_full') document.documentElement.requestFullscreen?.().catch(() => {});
            else if (layout !== 'camara_full' && prevLayoutFS === 'camara_full') { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); }
            prevLayoutFS = layout;
        }

        onMounted(async () => {
            actualizarReloj();
            setInterval(actualizarReloj, 1000);
            document.addEventListener('fullscreenchange', onFullscreenChange);
            document.addEventListener('keydown', (e) => { if (e.key === 'f' || e.key === 'F') toggleFullscreen(); });
            await cargarConfig();
            loaded.value = true;
            prevLayoutFS = config.layout_activo;
            if (config.mostrar_camara && config.camara_device_id) await iniciarCam1(config.camara_device_id);
            if (config.mostrar_camara && config.camara2_device_id) await iniciarCam2(config.camara2_device_id);
            if (config.slide_camara_device_id) await iniciarSlideCamara(config.slide_camara_device_id);
            pollInterval = setInterval(cargarConfig, 600);
        });

        onUnmounted(() => {
            if (pollInterval) clearInterval(pollInterval);
            detenerCam1(); detenerCam2(); detenerSlideCamara();
            document.removeEventListener('fullscreenchange', onFullscreenChange);
        });

        const esBienvenida = computed(() => config.layout_activo === 'bienvenida');
        const esCamaraFull = computed(() => config.layout_activo === 'camara_full');
        const esDiapositivas = computed(() => config.layout_activo === 'diapositivas');
        const esLowerThird = computed(() => config.layout_activo === 'lower_third');
        const esReceso = computed(() => config.layout_activo === 'receso');
        const esCierre = computed(() => config.layout_activo === 'cierre');
        const tieneCamaras = computed(() => config.mostrar_camara && (cam1Activa.value || cam2Activa.value));
        const mostrarCam = computed(() => tieneCamaras.value && !esBienvenida.value && !esCierre.value && !esReceso.value);
        const mostrarCamFondo = computed(() => mostrarCam.value && (esCamaraFull.value || esLowerThird.value));
        const mostrarCamPip = computed(() => mostrarCam.value && esDiapositivas.value);
        const mostrarLogo = computed(() => config.mostrar_logo && !esBienvenida.value && !esCierre.value && !esReceso.value);
        const esCam1Viva = computed(() => config.camara_activa === 1 || config.camara_activa === '1');
        const esCam2Viva = computed(() => config.camara_activa === 2 || config.camara_activa === '2');

        const esImagenSlide = computed(() => {
            const url = (config.slide_actual || '').toLowerCase();
            return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url);
        });

        return {
            config, reloj, fecha, loaded, cam1Activa, cam2Activa, slideCamaraActiva,
            isFullscreen, toggleFullscreen, countdownText, recesoCountdownText,
            esBienvenida, esCamaraFull, esDiapositivas, esLowerThird, esReceso, esCierre,
            mostrarCam, mostrarCamFondo, mostrarCamPip, mostrarLogo, audioRef, esImagenSlide,
            esCam1Viva, esCam2Viva, enTransicion,
        };
    },

    template: `
    <div class="overlay-root" :class="{ loaded }">

        <!-- ===== AUDIO DE FONDO ===== -->
        <audio id="bg-audio" ref="audioRef" src="/audio/AudioCorreo.mpeg" loop preload="auto"></audio>

        <!-- ===== CÁMARAS DE FONDO (2 capas con crossfade) ===== -->
        <video v-show="mostrarCamFondo && cam1Activa" id="overlay-cam1" autoplay playsinline muted
               class="cam-full" :class="{ 'cam-full--live': esCam1Viva, 'cam-full--out': !esCam1Viva, 'cam-full--transition': enTransicion }"></video>
        <video v-show="mostrarCamFondo && cam2Activa" id="overlay-cam2" autoplay playsinline muted
               class="cam-full" :class="{ 'cam-full--live': esCam2Viva, 'cam-full--out': !esCam2Viva, 'cam-full--transition': enTransicion }"></video>

        <!-- ===== CÁMARA PIP (solo en diapositivas) — muestra la cámara activa ===== -->
        <div v-show="mostrarCamPip" class="cam-pip" :class="'cam-pip--' + config.posicion_camara">
            <video v-if="cam1Activa" id="overlay-cam1-pip" autoplay playsinline muted
                   class="cam-pip__video" :class="{ 'cam-pip__video--live': esCam1Viva, 'cam-pip__video--out': !esCam1Viva }"></video>
            <video v-if="cam2Activa" id="overlay-cam2-pip" autoplay playsinline muted
                   class="cam-pip__video" :class="{ 'cam-pip__video--live': esCam2Viva, 'cam-pip__video--out': !esCam2Viva }"></video>
            <div class="cam-pip__frame"></div>
            <div class="cam-pip__name">{{ config.nombre_expositor }}</div>
        </div>

        <!-- ===== DIAPOSITIVA (fondo) ===== -->
        <div v-if="esDiapositivas && config.slide_actual" class="slide-bg">
            <img v-if="esImagenSlide" :src="config.slide_actual" class="slide-bg__img" :key="config.slide_actual" @error="config.slide_actual = ''" />
            <iframe v-else :src="config.slide_actual" class="slide-bg__iframe" :key="'iframe-'+config.slide_actual" frameborder="0" allowfullscreen></iframe>
        </div>

        <!-- ===== CÁMARA DIAPOSITIVAS (esquina pequeña independiente) ===== -->
        <div v-if="esDiapositivas && slideCamaraActiva" class="slide-cam-pip">
            <video id="slide-cam" autoplay playsinline muted class="slide-cam-pip__video"></video>
            <div class="slide-cam-pip__frame"></div>
        </div>

        <!-- ===== BARRA SUPERIOR ===== -->
        <transition name="slide-down">
            <div v-if="config.mostrar_barra_superior && !esBienvenida && !esCierre && !esReceso" class="topbar">
                <div class="topbar__inner">
                    <div class="topbar__brand">
                        <div class="topbar__icon">
                            <svg viewBox="0 0 60 44" width="36" height="27">
                                <rect x="1" y="1" width="58" height="42" rx="4" fill="#F2C41A" stroke="#1B3A7A" stroke-width="2"/>
                                <polyline points="1,1 30,24 59,1" fill="none" stroke="#1B3A7A" stroke-width="2.5"/>
                                <polygon points="14,6 10,14 14,12 18,14" fill="#E52521"/>
                                <polygon points="18,5 14,13 18,11 22,13" fill="#F2C41A"/>
                                <polygon points="22,4 18,12 22,10 26,12" fill="#009B3A"/>
                            </svg>
                        </div>
                        <div class="topbar__brand-text">
                            <strong>CORREOS</strong>
                            <span>DE BOLIVIA</span>
                        </div>
                    </div>
                    <div class="topbar__title">{{ config.titulo_evento }}</div>
                    <div class="topbar__right">
                        <div v-if="config.mostrar_en_vivo" class="topbar__live"><span class="live-dot"></span>EN VIVO</div>
                        <div v-if="config.mostrar_reloj" class="topbar__clock">
                            <div class="topbar__time">{{ reloj }}</div>
                            <div class="topbar__date">{{ fecha }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </transition>

        <!-- ===== LOGO FLOTANTE EN TRANSMISIÓN ===== -->
        <transition name="fade-scale">
            <div v-if="mostrarLogo" class="logo-overlay">
                <img src="/images/LogoAmarillo.png" class="logo-overlay__img" alt="Logo" />
            </div>
        </transition>

        <!-- ===== BIENVENIDA ===== -->
        <transition name="fade-scale">
            <div v-if="esBienvenida" class="screen screen--welcome">
                <div class="screen__decor">
                    <div class="decor-circle"></div>
                    <div class="decor-circle decor-circle--2"></div>
                    <div class="decor-circle decor-circle--3"></div>
                    <div class="decor-stripe"></div>
                    <div class="decor-stripe decor-stripe--2"></div>
                    <div class="decor-stripe decor-stripe--3"></div>
                    <div class="decor-particles">
                        <span v-for="n in 12" :key="n" class="decor-particle" :style="{left: (n*8.2)+'%', animationDelay: (n*0.3)+'s'}"></span>
                    </div>
                </div>
                <div class="screen__body">
                    <img src="/images/Logooriginal.png" class="screen__logo-img" alt="AGBC" />
                    <h2 class="screen__brand">CORREOS DE BOLIVIA</h2>
                    <div class="screen__divider"><span></span></div>
                    <h1 class="screen__title screen__title--white">{{ config.bienvenida_titulo }}</h1>
                    <h3 class="screen__event screen__event--white">{{ config.bienvenida_evento }}</h3>
                    <p class="screen__sub screen__sub--white">{{ config.bienvenida_subtitulo }}</p>
                    <div v-if="countdownText" class="countdown">
                        <div class="countdown__label">COMENZAMOS EN</div>
                        <div class="countdown__time">{{ countdownText }}</div>
                        <div class="countdown__bar"><div class="countdown__bar-inner"></div></div>
                    </div>
                    <div v-else class="screen__dots"><span></span><span></span><span></span></div>
                </div>
            </div>
        </transition>

        <!-- ===== RECESO ===== -->
        <transition name="fade-scale">
            <div v-if="esReceso" class="screen screen--receso">
                <div class="screen__decor">
                    <div class="decor-circle"></div>
                    <div class="decor-circle decor-circle--2"></div>
                    <div class="decor-circle decor-circle--3"></div>
                    <div class="decor-stripe"></div>
                    <div class="decor-stripe decor-stripe--2"></div>
                    <div class="decor-stripe decor-stripe--3"></div>
                    <div class="decor-particles">
                        <span v-for="n in 12" :key="n" class="decor-particle" :style="{left: (n*8.2)+'%', animationDelay: (n*0.3)+'s'}"></span>
                    </div>
                </div>
                <div class="screen__body">
                    <img src="/images/Logooriginal.png" class="screen__logo-img" alt="AGBC" />
                    <h2 class="screen__brand">CORREOS DE BOLIVIA</h2>
                    <div class="screen__divider"><span></span></div>
                    <div class="receso-icon">
                        <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M17 8h1a4 4 0 110 8h-1"/><path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z"/>
                            <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
                        </svg>
                    </div>
                    <h1 class="screen__title screen__title--white">{{ config.receso_titulo }}</h1>
                    <p class="screen__sub screen__sub--white">{{ config.receso_subtitulo }}</p>
                    <div v-if="recesoCountdownText" class="countdown">
                        <div class="countdown__label">VOLVEMOS EN</div>
                        <div class="countdown__time">{{ recesoCountdownText }}</div>
                        <div class="countdown__bar"><div class="countdown__bar-inner"></div></div>
                    </div>
                    <div v-else class="screen__dots"><span></span><span></span><span></span></div>
                </div>
            </div>
        </transition>

        <!-- ===== CIERRE ===== -->
        <transition name="fade-scale">
            <div v-if="esCierre" class="screen screen--close">
                <div class="screen__decor">
                    <div class="decor-circle"></div>
                    <div class="decor-circle decor-circle--2"></div>
                    <div class="decor-circle decor-circle--3"></div>
                    <div class="decor-stripe"></div>
                    <div class="decor-stripe decor-stripe--2"></div>
                    <div class="decor-stripe decor-stripe--3"></div>
                    <div class="decor-particles">
                        <span v-for="n in 12" :key="n" class="decor-particle" :style="{left: (n*8.2)+'%', animationDelay: (n*0.3)+'s'}"></span>
                    </div>
                </div>
                <div class="screen__body">
                    <img src="/images/Logooriginal.png" class="screen__logo-img" alt="AGBC" />
                    <h1 class="screen__title screen__title--cierre">{{ config.cierre_titulo }}</h1>
                    <div class="screen__divider"><span></span></div>
                    <h2 class="screen__brand">CORREOS DE BOLIVIA</h2>
                    <p class="screen__social screen__social--white">{{ config.cierre_redes }}</p>
                    <div class="screen__wave">
                        <svg viewBox="0 0 1920 120" preserveAspectRatio="none"><path d="M0,60 C480,120 960,0 1440,60 C1680,90 1800,30 1920,60 L1920,120 L0,120 Z" fill="rgba(242,196,26,.1)"/></svg>
                    </div>
                </div>
            </div>
        </transition>

        <!-- ===== LOWER THIRD — Modelo Broadcast ===== -->
        <transition name="lt-tv">
            <div v-if="config.mostrar_lower_third && (esLowerThird || esCamaraFull || esDiapositivas)" class="lt" key="lt">
                <div class="lt__wrap">
                    <div class="lt__back-layer"></div>
                    <div class="lt__top-accent"></div>
                    <div class="lt__logo-panel">
                        <div class="lt__logo-content">
                            <img src="/images/Logooriginal.png" alt="Correos de Bolivia" />
                        </div>
                    </div>
                    <div class="lt__text-side">
                        <div class="lt__title-bar">
                            <h1 class="lt__title">{{ config.texto_principal }}</h1>
                        </div>
                        <div class="lt__subtitle-bar">
                            <p class="lt__sub">{{ config.texto_secundario }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </transition>

        <!-- ===== TICKER ===== -->
        <transition name="slide-up-ticker">
            <div v-if="config.mostrar_ticker && !esBienvenida && !esCierre && !esReceso" class="ticker">
                <div class="ticker__badge">{{ reloj }}</div>
                <div class="ticker__track">
                    <div class="ticker__runner">
                        <span>{{ config.texto_ticker }}&nbsp;&nbsp;&nbsp;&bull;&nbsp;&nbsp;&nbsp;{{ config.texto_ticker }}&nbsp;&nbsp;&nbsp;&bull;&nbsp;&nbsp;&nbsp;</span>
                    </div>
                </div>
            </div>
        </transition>

        <!-- ===== BOTÓN PANTALLA COMPLETA ===== -->
        <button class="fs-btn" :class="{ 'fs-btn--active': isFullscreen }" @click="toggleFullscreen" :title="isFullscreen ? 'Salir (F)' : 'Pantalla completa (F)'">
            <svg v-if="!isFullscreen" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>
            <svg v-else viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h2a2 2 0 012 2v2m8-8h2a2 2 0 002-2V6m-8 8H8a2 2 0 01-2-2v-2m8 8h2a2 2 0 002-2v-2"/></svg>
        </button>

    </div>
    `,
};

createApp(OverlayApp).mount('#overlay-app');
