import React, { useState, useRef, useCallback, useEffect } from "react";

// ─── App brand color ──────────────────────────────────────────────────────────
const APP_COLOR = "#22C55E";
const OUTPUT_SIZE = 400;
const GRID_SPACING = 80;

// Rainbow gradient stops for the multicolor border
const RAINBOW_STOPS = [
  "#FF0000", "#FF7700", "#FFEE00", "#00CC00",
  "#0088FF", "#8800FF", "#FF0088", "#FF0000",
];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// ── Draw blur bg: first fills with solid bgColor, then draws blurred image on top ──
function drawBlurredBg(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cs: number, bgColor: string) {
  // 1. Solid color base so the blur always has a tinted background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, cs, cs);

  // 2. Blurred image cover — drawn with globalAlpha so the color bleeds through
  const cover = Math.max(cs / img.width, cs / img.height);
  const bw = img.width * cover;
  const bh = img.height * cover;
  const bx = (cs - bw) / 2;
  const by = (cs - bh) / 2;
  const margin = 60;
  ctx.filter = "blur(14px)";
  ctx.globalAlpha = 0.82; // let the bg color show slightly through
  ctx.drawImage(img, bx - margin, by - margin, bw + margin * 2, bh + margin * 2);
  ctx.globalAlpha = 1;
  ctx.filter = "none";

  // 3. Very subtle dark overlay for contrast
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(0, 0, cs, cs);
}


// Smooth interpolation across RAINBOW_STOPS
function interpolateRainbow(t: number) {
  const stops = RAINBOW_STOPS;
  const n = stops.length - 1;
  const pos = t * n;
  const i = Math.floor(pos);
  const f = pos - i;
  const c1 = hexToRgb(stops[Math.min(i, n)]);
  const c2 = hexToRgb(stops[Math.min(i + 1, n)]);
  const r = Math.round(c1.r + (c2.r - c1.r) * f);
  const g = Math.round(c1.g + (c2.g - c1.g) * f);
  const b = Math.round(c1.b + (c2.b - c1.b) * f);
  return `rgb(${r},${g},${b})`;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

// ── Resolve the actual border color string (or "rainbow") for canvas drawing ─
function resolveBorderColor(borderColor: string, bgMode: string, bgColor: string) {
  if (borderColor === "rainbow") return "rainbow";
  if (borderColor === "auto") return bgMode === "color" ? bgColor : "#ffffff";
  return borderColor;
}

interface ProfilePhotoEditorProps {
  onSave: (data: { 
    photo: string; 
    photoRaw: string | null; 
    photoBorder: {
      show: boolean;
      type: string;
      color: string;
      width: number;
    };
    photoScale: number;
    photoOffset: { x: number; y: number };
    useInitials: boolean;
  }) => void;
  onCancel: () => void;
  userName?: string;
  initialImageSrc?: string | null;
  initialBorder?: any;
  initialScale?: number;
  initialOffset?: { x: number; y: number };
  initialUseInitials?: boolean;
}

const ProfilePhotoEditor: React.FC<ProfilePhotoEditorProps> = ({ 
  onSave, 
  onCancel, 
  userName = "Usuário",
  initialImageSrc = null,
  initialBorder,
  initialScale = 1,
  initialOffset = { x: 0, y: 0 },
  initialUseInitials = false
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(initialImageSrc);
  const [bgMode, setBgMode] = useState<"blur" | "color">("blur");
  const [bgColor, setBgColor] = useState("#1a1a2e");
  
  const [useInitials, setUseInitials] = useState(initialUseInitials);
  const [showBorder, setShowBorder] = useState(initialBorder?.show ?? false);
  const [borderColor, setBorderColor] = useState(initialBorder?.color ?? "auto");
  const [borderWidth, setBorderWidth] = useState(initialBorder?.width ?? 8);
  
  const [scale, setScale] = useState(initialScale);
  const [offset, setOffset] = useState(initialOffset);

  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState(300);

  // ── Measure container ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function measure() {
        if (el) {
            setCanvasSize(Math.min(el.clientWidth, el.clientHeight) - 4);
        }
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.unobserve(el);
  }, []);

  // ── Sync with external initialImageSrc ─────────────────────────────────────
  useEffect(() => {
    if (initialImageSrc !== undefined) {
      setImageSrc(initialImageSrc);
      if (initialImageSrc) setUseInitials(false);
    }
  }, [initialImageSrc]);

  // ── Manual wheel listener to avoid passive event issues ───────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheelManual = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => clamp(s - e.deltaY * 0.002, 0.1, 10));
    };

    canvas.addEventListener('wheel', handleWheelManual, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheelManual);
  }, []);

  // ── Load image ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!imageSrc) return;
    const img = new window.Image();
    img.src = imageSrc;
    img.onload = () => {
      imgRef.current = img;
      if (initialScale === 1 && initialOffset.x === 0 && initialOffset.y === 0) {
        const fit = Math.max(canvasSize / img.width, canvasSize / img.height);
        setScale(fit);
        setOffset({ x: 0, y: 0 });
      } else {
        setScale(initialScale);
        setOffset(initialOffset);
      }
    };
  }, [imageSrc, canvasSize, initialScale, initialOffset]);

  // ── Render loop ─────────────────────────────────────────────────────────────
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cs = canvasSize;
    canvas.width = cs;
    canvas.height = cs;
    ctx.clearRect(0, 0, cs, cs);

    if (!imgRef.current) {
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, cs, cs);
      return;
    }

    const img = imgRef.current;
    const sw = img.width * scale;
    const sh = img.height * scale;
    const x = cs / 2 - sw / 2 + offset.x;
    const y = cs / 2 - sh / 2 + offset.y;

    // Background
    if (bgMode === "color") {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, cs, cs);
    } else {
      drawBlurredBg(ctx, img, cs, bgColor);
    }

    ctx.drawImage(img, x, y, sw, sh);
  }, [scale, offset, bgMode, bgColor, canvasSize, imageSrc]);

  useEffect(() => {
    if (!useInitials) {
      drawFrame();
    }
  }, [drawFrame, useInitials]);

  // ── File input ─────────────────────────────────────────────────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageSrc(ev.target?.result as string);
      setUseInitials(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Pointer events ─────────────────────────────────────────────────────────
  const onPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length === 2) return;
    e.preventDefault();
    dragging.current = true;
    const p = 'touches' in e ? e.touches[0] : e;
    lastMouse.current = { x: p.clientX, y: p.clientY };
  };

  const onPointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastPinchDist.current !== null) {
        const delta = dist - lastPinchDist.current;
        setScale((s) => clamp(s + delta * 0.005, 0.1, 10));
      }
      lastPinchDist.current = dist;
      return;
    }
    if (!dragging.current) return;
    const p = 'touches' in e ? e.touches[0] : e;
    const dx = p.clientX - lastMouse.current.x;
    const dy = p.clientY - lastMouse.current.y;
    lastMouse.current = { x: p.clientX, y: p.clientY };
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
  }, [scale]);

  const onPointerUp = () => {
    dragging.current = false;
    lastPinchDist.current = null;
  };


  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = () => {
    let finalPhoto = "";
    
    if (imgRef.current && !useInitials) {
      const cs = canvasSize;
      const os = OUTPUT_SIZE;
      const ratio = os / cs;
      const img = imgRef.current;

      const out = document.createElement("canvas");
      out.width = os;
      out.height = os;
      const ctx = out.getContext("2d");
      if (!ctx) return;

      // Clip to circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(os / 2, os / 2, os / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Background
      if (bgMode === "color") {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, os, os);
      } else {
        drawBlurredBg(ctx, img, os, bgColor);
      }

      // Main image
      const sw = img.width * scale * ratio;
      const sh = img.height * scale * ratio;
      const x = os / 2 - sw / 2 + offset.x * ratio;
      const y = os / 2 - sh / 2 + offset.y * ratio;
      ctx.drawImage(img, x, y, sw, sh);

      ctx.restore();
      finalPhoto = out.toDataURL("image/png");
    }

    onSave?.({ 
      photo: finalPhoto, 
      photoRaw: imageSrc,
      photoBorder: {
        show: showBorder,
        type: borderColor === 'rainbow' ? 'rainbow' : 'solid',
        color: borderColor,
        width: borderWidth
      },
      photoScale: scale,
      photoOffset: offset,
      useInitials
    });
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const r = canvasSize / 2;
  const g = GRID_SPACING;
  // Border preview width in display pixels
  const bwDisplay = (borderWidth / OUTPUT_SIZE) * canvasSize;
  const resolvedBorderColor = resolveBorderColor(borderColor, bgMode, bgColor);

  // Rainbow gradient stops for the multicolor border preview ring (used in RainbowRingPreview component via interpolateRainbow)

  return (
    <div style={styles.overlay} onClick={() => onCancel?.()}>
      <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.title}>AJUSTAR FOTO</span>
          <span style={styles.subtitle}>Arraste e redimensione para o centro</span>
        </div>

        {/* Canvas / Preview Space */}
        <div ref={containerRef} style={styles.canvasWrap}>
          <div style={{ position: "relative", width: canvasSize, height: canvasSize }}>
            {useInitials ? (
              <div 
                style={{ 
                  width: canvasSize, 
                  height: canvasSize, 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  background: bgMode === 'color' ? bgColor : '#1a1a2e',
                  borderRadius: 12,
                  fontSize: canvasSize * 0.45,
                  color: APP_COLOR,
                  fontWeight: 900,
                  textTransform: 'uppercase'
                }}
              >
                {(() => {
                  const parts = userName.trim().split(' ');
                  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
                  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                })()}
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={canvasSize}
                height={canvasSize}
                style={{ display: "block", borderRadius: 12, cursor: imageSrc ? "grab" : "default", touchAction: "none" }}
                 onMouseDown={onPointerDown}
                onMouseMove={onPointerMove}
                onMouseUp={onPointerUp}
                onMouseLeave={onPointerUp}
                onTouchStart={onPointerDown}
                onTouchMove={onPointerMove}
                onTouchEnd={onPointerUp}
              />
            )}

            {/* Internal Change Photo Button */}
            {!useInitials && imageSrc && (
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: "absolute",
                  bottom: 12,
                  right: 12,
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.6)",
                  border: "1.5px solid rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  cursor: "pointer",
                  zIndex: 10,
                  backdropFilter: "blur(4px)"
                }}
                title="Trocar Foto"
              >
                <span className="material-symbols-outlined text-[20px]!">sync_alt</span>
              </button>
            )}

            {/* SVG overlay */}
            <svg
              style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
              width={canvasSize}
              height={canvasSize}
            >
              <defs>
                <mask id="outerMask">
                  <rect width={canvasSize} height={canvasSize} fill="white" />
                  <circle cx={r} cy={r} r={r - 2} fill="black" />
                </mask>
                <clipPath id="innerClip">
                  <circle cx={r} cy={r} r={r - 3} />
                </clipPath>
              </defs>

              {/* Dark area outside circle */}
              <rect width={canvasSize} height={canvasSize} fill="rgba(0,0,0,0.58)" mask="url(#outerMask)" />

              {/* Grid lines (only for photo) */}
              {!useInitials && (
                <g stroke="rgba(255,255,255,0.26)" strokeWidth="0.75" clipPath="url(#innerClip)">
                  <line x1={r} y1={0} x2={r} y2={canvasSize} />
                  <line x1={r - g} y1={0} x2={r - g} y2={canvasSize} />
                  <line x1={r + g} y1={0} x2={r + g} y2={canvasSize} />
                  <line x1={0} y1={r} x2={canvasSize} y2={r} />
                  <line x1={0} y1={r - g} x2={canvasSize} y2={r - g} />
                  <line x1={0} y1={r + g} x2={canvasSize} y2={r + g} />
                </g>
              )}

              {/* Circle edge */}
              <circle cx={r} cy={r} r={r - 2} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />

              {/* Border preview */}
              {showBorder && (
                resolvedBorderColor === "rainbow" ? (
                  <RainbowRingPreview cx={r} cy={r} radius={r - 2 - bwDisplay / 2} lineWidth={bwDisplay} />
                ) : (
                  <circle
                    cx={r} cy={r}
                    r={r - 2 - bwDisplay / 2}
                    fill="none"
                    stroke={resolvedBorderColor}
                    strokeWidth={bwDisplay}
                  />
                )
              )}
            </svg>

            {/* Upload prompt */}
            {!imageSrc && !useInitials && (
              <div style={styles.uploadPrompt} onClick={() => fileInputRef.current?.click()}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={APP_COLOR} strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span style={{ color: APP_COLOR, marginTop: 10, fontSize: 13, fontWeight: 600 }}>
                  Toque para escolher foto
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div style={styles.controls}>
          {/* Selector: Foto vs Iniciais */}
          <div style={{ ...styles.row, justifyContent: "center", marginBottom: 4 }}>
            <button
               type="button"
               style={{ ...styles.pill, ...(useInitials ? {} : styles.pillActive) }}
               onClick={() => setUseInitials(false)}
            >
              <span className="material-symbols-outlined text-[18px]! mr-1">image</span>
              Foto
            </button>
            <button
               type="button"
               style={{ ...styles.pill, ...(useInitials ? styles.pillActive : {}) }}
               onClick={() => setUseInitials(true)}
            >
              <span className="material-symbols-outlined text-[18px]! mr-1">font_download</span>
              Iniciais
            </button>
          </div>

          {(imageSrc || useInitials) && (
            <>
              {/* Row 1: blur + color dots + border toggle */}
              <div style={styles.row}>
                {!useInitials && (
                  <button
                    type="button"
                    style={{ ...styles.pill, ...(bgMode === "blur" ? styles.pillActive : {}) }}
                    onClick={() => setBgMode("blur")}
                  >
                    <BlurIcon /> Blur
                  </button>
                )}

              <div style={styles.colorDots}>
                {["#1a1a2e", "#ffffff", "#000000"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setBgMode("color"); setBgColor(c); }}
                    style={{
                      ...styles.colorDot,
                      background: c,
                      outline: bgMode === "color" && bgColor === c
                        ? `2.5px solid ${APP_COLOR}`
                        : "1.5px solid rgba(255,255,255,0.18)",
                      outlineOffset: 1.5,
                    }}
                  />
                ))}
                {/* Custom color picker */}
                <label style={{ ...styles.colorDot, overflow: "hidden", cursor: "pointer", position: "relative" }}>
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)",
                    borderRadius: "50%",
                  }} />
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => { setBgMode("color"); setBgColor(e.target.value); }}
                    style={{ opacity: 0, position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer" }}
                  />
                </label>
              </div>

              <button
                type="button"
                style={{ ...styles.pill, marginLeft: "auto", ...(showBorder ? styles.pillActive : {}) }}
                onClick={() => setShowBorder((prev: boolean) => !prev)}
              >
                <BorderIcon /> Moldura
              </button>
            </div>

            {/* Row 2: Border options (only when border active) */}
            {showBorder && (
              <>
                {/* Border color chooser */}
                <div style={{ ...styles.row, gap: 6 }}>
                  <span style={styles.sliderLabel}>Cor:</span>

                  {/* Auto (follows bg) */}
                  <button
                    type="button"
                    onClick={() => setBorderColor("auto")}
                    style={{
                      ...styles.pill,
                      padding: "4px 10px",
                      fontSize: 11,
                      ...(borderColor === "auto" ? styles.pillActive : {}),
                    }}
                  >
                    Auto
                  </button>

                  {/* White */}
                  <button
                    type="button"
                    onClick={() => setBorderColor("#ffffff")}
                    style={{
                      ...styles.colorDot,
                      background: "#ffffff",
                      outline: borderColor === "#ffffff" ? `2.5px solid ${APP_COLOR}` : "1.5px solid rgba(255,255,255,0.18)",
                      outlineOffset: 1.5,
                    }}
                  />

                  {/* Black */}
                  <button
                    type="button"
                    onClick={() => setBorderColor("#000000")}
                    style={{
                      ...styles.colorDot,
                      background: "#000000",
                      outline: borderColor === "#000000" ? `2.5px solid ${APP_COLOR}` : "1.5px solid rgba(255,255,255,0.18)",
                      outlineOffset: 1.5,
                    }}
                  />

                  {/* Custom color */}
                  <label style={{ ...styles.colorDot, overflow: "hidden", cursor: "pointer", position: "relative" }}>
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)",
                      borderRadius: "50%",
                    }} />
                    <input
                      type="color"
                      onChange={(e) => setBorderColor(e.target.value)}
                      style={{ opacity: 0, position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer" }}
                    />
                  </label>

                  {/* Rainbow */}
                  <button
                    type="button"
                    onClick={() => setBorderColor("rainbow")}
                    style={{
                      ...styles.colorDot,
                      background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)",
                      outline: borderColor === "rainbow" ? `2.5px solid ${APP_COLOR}` : "1.5px solid rgba(255,255,255,0.18)",
                      outlineOffset: 1.5,
                      fontSize: 11,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {borderColor === "rainbow" && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="white">
                        <polyline points="1,6 5,10 11,2" strokeWidth="2" stroke="white" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                </div>

                {/* Border thickness */}
                <div style={styles.sliderRow}>
                  <span style={styles.sliderLabel}>Espessura</span>
                  <input
                    type="range" min={2} max={32} step={1}
                    value={borderWidth}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBorderWidth(parseInt(e.target.value))}
                    style={styles.slider}
                  />
                  <span style={{ ...styles.sliderLabel, minWidth: 28, textAlign: "right" }}>{borderWidth}px</span>
                </div>
              </>
            )}

              {/* Zoom (only for photo) */}
              {!useInitials && (
                <div style={styles.sliderRow}>
                  <ZoomInIcon />
                  <input
                    type="range" min={0.1} max={10} step={0.01}
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    style={styles.slider}
                  />
                  <ZoomOutIcon />
                </div>
              )}
            </>
          )}
        </div>

        {/* Buttons */}
        <div style={styles.btnRow}>
          <button type="button" style={styles.btnSecondary} onClick={() => onCancel?.()}>
            Cancelar
          </button>
          <button 
            type="button" 
            style={styles.btnPrimary} 
            onClick={handleSave}
          >
            Salvar Alterações
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
      </div>

      <style>{`
        input[type=range]{-webkit-appearance:none;height:4px;border-radius:2px;background:rgba(255,255,255,0.12);outline:none;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:${APP_COLOR};cursor:pointer;box-shadow:0 0 0 3px rgba(34,197,94,0.2);}
        input[type=range]::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:${APP_COLOR};border:none;cursor:pointer;}
      `}</style>
    </div>
  );
}

// ── Rainbow ring preview in SVG using many short arc segments ─────────────────
function RainbowRingPreview({ cx, cy, radius, lineWidth }: { cx: number, cy: number, radius: number, lineWidth: number }) {
  const segments = 120;
  const paths = [];
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const t2 = (i + 1) / segments;
    const a1 = t * Math.PI * 2 - Math.PI / 2;
    const a2 = t2 * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + radius * Math.cos(a1);
    const y1 = cy + radius * Math.sin(a1);
    const x2 = cx + radius * Math.cos(a2);
    const y2 = cy + radius * Math.sin(a2);
    const color = interpolateRainbow(t);
    paths.push(
      <path
        key={i}
        d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
        stroke={color}
        strokeWidth={lineWidth}
        fill="none"
        strokeLinecap="butt"
      />
    );
  }
  return <g>{paths}</g>;
}

// ─── Icon helpers ─────────────────────────────────────────────────────────────
function BlurIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 5, flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="5" opacity=".4" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function BorderIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 5, flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" strokeOpacity=".5" />
    </svg>
  );
}
function ZoomInIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="2" style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}
function ZoomOutIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="2" style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.85)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    zIndex: 9999,
    fontFamily: "'DM Sans','Helvetica Neue',sans-serif",
  },
  sheet: {
    width: "100%", maxWidth: 500,
    background: "#111118",
    borderRadius: "22px 22px 0 0",
    paddingBottom: "env(safe-area-inset-bottom,12px)",
    display: "flex", flexDirection: "column",
    maxHeight: "97dvh", overflow: "hidden",
  },
  header: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "18px 16px 6px", flexShrink: 0,
  },
  title: { color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase" },
  subtitle: { color: "rgba(255,255,255,0.38)", fontSize: 11.5, marginTop: 4 },
  canvasWrap: {
    flex: 1, minHeight: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "6px 16px",
  },
  uploadPrompt: {
    position: "absolute", inset: 0,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    cursor: "pointer", borderRadius: 12, background: "rgba(0,0,0,0.45)",
  },
  controls: {
    padding: "6px 18px 2px",
    display: "flex", flexDirection: "column", gap: 8, flexShrink: 0,
  },
  row: { display: "flex", alignItems: "center", gap: 8, flexWrap: "nowrap" },
  pill: {
    display: "flex", alignItems: "center",
    padding: "6px 12px", borderRadius: 999,
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: "rgba(255,255,255,0.14)",
    background: "transparent", color: "rgba(255,255,255,0.55)",
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    letterSpacing: 0.4, transition: "all .18s", whiteSpace: "nowrap",
  },
  pillActive: { background: APP_COLOR, borderColor: APP_COLOR, color: "#fff" },
  colorDots: { display: "flex", alignItems: "center", gap: 7 },
  colorDot: {
    width: 24, height: 24, borderRadius: "50%",
    cursor: "pointer", border: "none", flexShrink: 0,
  },
  sliderRow: { display: "flex", alignItems: "center", gap: 10 },
  sliderLabel: { color: "rgba(255,255,255,0.38)", fontSize: 11, minWidth: 40 },
  slider: { flex: 1 },
  btnRow: { display: "flex", gap: 10, padding: "10px 18px 14px", flexShrink: 0 },
  btnSecondary: {
    flex: 1, padding: "13px 0", borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: "rgba(255,255,255,0.14)",
    background: "transparent", color: "rgba(255,255,255,0.65)",
    fontSize: 14, fontWeight: 600, cursor: "pointer",
    letterSpacing: 0.5, textTransform: "uppercase",
  },
  btnPrimary: {
    flex: 2, padding: "13px 0", borderRadius: 14, border: "none",
    background: APP_COLOR, color: "#fff",
    fontSize: 14, fontWeight: 700, cursor: "pointer",
    letterSpacing: 0.6, textTransform: "uppercase",
    boxShadow: "0 4px 18px rgba(34,197,94,0.32)",
  },
};

export default ProfilePhotoEditor;
