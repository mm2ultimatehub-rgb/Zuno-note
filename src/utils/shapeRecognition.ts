import { CanvasStamp, InkStroke, ShapeKind, StrokePoint } from '../types/notes';

export function buildShapePoints(
  kind: ShapeKind,
  start: StrokePoint,
  end: StrokePoint
): StrokePoint[] {
  if (kind === 'line') return [start, end];

  if (kind === 'arrow') {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const headLen = Math.min(
      32,
      Math.max(12, Math.hypot(end.x - start.x, end.y - start.y) * 0.24)
    );
    return [
      start,
      end,
      {
        x: end.x - headLen * Math.cos(angle - Math.PI / 6),
        y: end.y - headLen * Math.sin(angle - Math.PI / 6),
        pressure: 0.6,
      },
      end,
      {
        x: end.x - headLen * Math.cos(angle + Math.PI / 6),
        y: end.y - headLen * Math.sin(angle + Math.PI / 6),
        pressure: 0.6,
      },
    ];
  }

  if (kind === 'doubleArrow') {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const headLen = Math.min(
      28,
      Math.max(12, Math.hypot(end.x - start.x, end.y - start.y) * 0.22)
    );
    return [
      {
        x: start.x + headLen * Math.cos(angle - Math.PI / 6),
        y: start.y + headLen * Math.sin(angle - Math.PI / 6),
        pressure: 0.6,
      },
      start,
      {
        x: start.x + headLen * Math.cos(angle + Math.PI / 6),
        y: start.y + headLen * Math.sin(angle + Math.PI / 6),
        pressure: 0.6,
      },
      start,
      end,
      {
        x: end.x - headLen * Math.cos(angle - Math.PI / 6),
        y: end.y - headLen * Math.sin(angle - Math.PI / 6),
        pressure: 0.6,
      },
      end,
      {
        x: end.x - headLen * Math.cos(angle + Math.PI / 6),
        y: end.y - headLen * Math.sin(angle + Math.PI / 6),
        pressure: 0.6,
      },
    ];
  }

  if (kind === 'rect') {
    return [
      { x: start.x, y: start.y, pressure: 0.6 },
      { x: end.x, y: start.y, pressure: 0.6 },
      { x: end.x, y: end.y, pressure: 0.6 },
      { x: start.x, y: end.y, pressure: 0.6 },
      { x: start.x, y: start.y, pressure: 0.6 },
    ];
  }

  if (kind === 'roundedRect') {
    const x0 = Math.min(start.x, end.x);
    const y0 = Math.min(start.y, end.y);
    const x1 = Math.max(start.x, end.x);
    const y1 = Math.max(start.y, end.y);
    const r = Math.min((x1 - x0) * 0.2, (y1 - y0) * 0.2, 26);
    const pts: StrokePoint[] = [];
    const corners = [
      { cx: x1 - r, cy: y0 + r, a0: -Math.PI / 2, a1: 0 },
      { cx: x1 - r, cy: y1 - r, a0: 0, a1: Math.PI / 2 },
      { cx: x0 + r, cy: y1 - r, a0: Math.PI / 2, a1: Math.PI },
      { cx: x0 + r, cy: y0 + r, a0: Math.PI, a1: Math.PI * 1.5 },
    ];
    for (const c of corners) {
      for (let i = 0; i <= 5; i++) {
        const a = c.a0 + ((c.a1 - c.a0) * i) / 5;
        pts.push({
          x: c.cx + Math.cos(a) * r,
          y: c.cy + Math.sin(a) * r,
          pressure: 0.6,
        });
      }
    }
    if (pts.length > 0) pts.push({ ...pts[0] });
    return pts;
  }

  if (kind === 'triangle') {
    const midX = (start.x + end.x) / 2;
    return [
      { x: midX, y: start.y, pressure: 0.6 },
      { x: end.x, y: end.y, pressure: 0.6 },
      { x: start.x, y: end.y, pressure: 0.6 },
      { x: midX, y: start.y, pressure: 0.6 },
    ];
  }

  if (kind === 'diamond') {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    return [
      { x: midX, y: start.y, pressure: 0.6 },
      { x: end.x, y: midY, pressure: 0.6 },
      { x: midX, y: end.y, pressure: 0.6 },
      { x: start.x, y: midY, pressure: 0.6 },
      { x: midX, y: start.y, pressure: 0.6 },
    ];
  }

  if (kind === 'hexagon') {
    const cx = (start.x + end.x) / 2;
    const cy = (start.y + end.y) / 2;
    const rx = Math.abs(end.x - start.x) / 2;
    const ry = Math.abs(end.y - start.y) / 2;
    const pts: StrokePoint[] = [];
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      pts.push({
        x: cx + Math.cos(a) * rx,
        y: cy + Math.sin(a) * ry,
        pressure: 0.6,
      });
    }
    return pts;
  }

  if (kind === 'star') {
    const cx = (start.x + end.x) / 2;
    const cy = (start.y + end.y) / 2;
    const rx = Math.abs(end.x - start.x) / 2;
    const ry = Math.abs(end.y - start.y) / 2;
    const pts: StrokePoint[] = [];
    for (let i = 0; i <= 10; i++) {
      const rScale = i % 2 === 0 ? 1 : 0.42;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      pts.push({
        x: cx + Math.cos(a) * rx * rScale,
        y: cy + Math.sin(a) * ry * rScale,
        pressure: 0.6,
      });
    }
    return pts;
  }

  const cx = (start.x + end.x) / 2;
  const cy = (start.y + end.y) / 2;
  const rx = Math.abs(end.x - start.x) / 2;
  const ry = Math.abs(end.y - start.y) / 2;
  const steps = 44;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    return {
      x: cx + Math.cos(a) * rx,
      y: cy + Math.sin(a) * ry,
      pressure: 0.6,
    };
  });
}

function perpDist(pt: StrokePoint, a: StrokePoint, b: StrokePoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) return Math.hypot(pt.x - a.x, pt.y - a.y);
  const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / lenSq));
  return Math.hypot(pt.x - (a.x + t * dx), pt.y - (a.y + t * dy));
}

function rdpSimplify(pts: StrokePoint[], eps: number): StrokePoint[] {
  if (pts.length <= 2) return pts;
  let maxDist = 0;
  let maxIdx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }
  if (maxDist > eps) {
    const left = rdpSimplify(pts.slice(0, maxIdx + 1), eps);
    const right = rdpSimplify(pts.slice(maxIdx), eps);
    return [...left.slice(0, -1), ...right];
  }
  return [pts[0], pts[pts.length - 1]];
}

function polygonArea(pts: StrokePoint[]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}

export function recognizeAndBeautifyShape(
  rawPoints: StrokePoint[]
): { label: string; points: StrokePoint[] } | null {
  if (rawPoints.length < 6) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let totalLen = 0;

  for (let i = 0; i < rawPoints.length; i++) {
    const p = rawPoints[i];
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
    if (i > 0) {
      totalLen += Math.hypot(p.x - rawPoints[i - 1].x, p.y - rawPoints[i - 1].y);
    }
  }

  const w = maxX - minX;
  const h = maxY - minY;
  const diag = Math.hypot(w, h);
  if (diag < 28 || totalLen < 30) return null;

  const first = rawPoints[0];
  const last = rawPoints[rawPoints.length - 1];
  const endGap = Math.hypot(last.x - first.x, last.y - first.y);

  // 1. Check Straight Line
  let maxLineDev = 0;
  for (let i = 1; i < rawPoints.length - 1; i++) {
    const d = perpDist(rawPoints[i], first, last);
    if (d > maxLineDev) maxLineDev = d;
  }
  if (endGap > diag * 0.8 && maxLineDev < Math.max(10, diag * 0.085)) {
    return {
      label: 'Düz Çizgi',
      points: [
        { x: first.x, y: first.y, pressure: 0.6 },
        { x: last.x, y: last.y, pressure: 0.6 },
      ],
    };
  }

  // 2. Check Closed Shape
  const isClosed = endGap < Math.max(48, diag * 0.36);
  if (!isClosed) return null;

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rx = Math.max(w / 2, 6);
  const ry = Math.max(h / 2, 6);

  // Check Circle / Ellipse fit
  let ellipseErrSum = 0;
  for (let i = 0; i < rawPoints.length; i++) {
    const nx = (rawPoints[i].x - cx) / rx;
    const ny = (rawPoints[i].y - cy) / ry;
    const rad = Math.hypot(nx, ny);
    ellipseErrSum += Math.abs(rad - 1);
  }
  const meanEllipseErr = ellipseErrSum / rawPoints.length;

  // Simplify closed loop with RDP to detect polygon vertices, then prune redundant collinear seam vertices
  const closedPts = [...rawPoints, first];
  const polyEps = Math.max(8, diag * 0.068);
  const simplified = rdpSimplify(closedPts, polyEps);
  const rawVertices = simplified.slice(0, -1);
  const vertices: StrokePoint[] = [];
  for (let i = 0; i < rawVertices.length; i++) {
    const prev = rawVertices[(i - 1 + rawVertices.length) % rawVertices.length];
    const curr = rawVertices[i];
    const next = rawVertices[(i + 1) % rawVertices.length];
    if (rawVertices.length > 3 && perpDist(curr, prev, next) < polyEps * 0.85) {
      continue;
    }
    vertices.push(curr);
  }
  const bboxArea = Math.max(1, w * h);
  const fillRatio = polygonArea(rawPoints) / bboxArea;

  // Prefer Circle/Ellipse if fillRatio matches pi/4 (~0.785) and radial error is low, and not a crisp 3- or 4-corner polygon
  if (
    meanEllipseErr < 0.145 &&
    fillRatio < 0.85 &&
    (vertices.length >= 6 || (meanEllipseErr < 0.088 && vertices.length !== 3 && vertices.length !== 4))
  ) {
    const aspect = Math.min(w, h) / Math.max(w, h);
    if (aspect > 0.82) {
      const r = (rx + ry) / 2;
      return {
        label: 'Daire',
        points: buildShapePoints(
          'circle',
          { x: cx - r, y: cy - r, pressure: 0.6 },
          { x: cx + r, y: cy + r, pressure: 0.6 }
        ),
      };
    }
    return {
      label: 'Elips',
      points: buildShapePoints(
        'circle',
        { x: minX, y: minY, pressure: 0.6 },
        { x: maxX, y: maxY, pressure: 0.6 }
      ),
    };
  }

  // Triangle (3 vertices or triangular area fill ~0.5)
  if (vertices.length === 3) {
    // Check if vertices match a tidy upright triangle or preserve detected corners cleanly
    const sortedByY = [...vertices].sort((a, b) => a.y - b.y);
    const top = sortedByY[0];
    const bottomPair = sortedByY.slice(1).sort((a, b) => a.x - b.x);
    const isNearUpright =
      Math.abs(bottomPair[0].y - bottomPair[1].y) < h * 0.25 &&
      Math.abs(top.x - cx) < w * 0.28;
    if (isNearUpright) {
      return {
        label: 'Üçgen',
        points: buildShapePoints(
          'triangle',
          { x: minX, y: minY, pressure: 0.6 },
          { x: maxX, y: maxY, pressure: 0.6 }
        ),
      };
    }
    return {
      label: 'Üçgen',
      points: [
        { ...vertices[0], pressure: 0.6 },
        { ...vertices[1], pressure: 0.6 },
        { ...vertices[2], pressure: 0.6 },
        { ...vertices[0], pressure: 0.6 },
      ],
    };
  }

  // 4 corners: Square / Rectangle vs Diamond
  if (vertices.length === 4 || (vertices.length === 5 && fillRatio > 0.66)) {
    // Check if diamond (corners near midpoints of bbox sides)
    const midHits = vertices.filter(
      (v) =>
        (Math.abs(v.x - cx) < w * 0.22 && (Math.abs(v.y - minY) < h * 0.22 || Math.abs(v.y - maxY) < h * 0.22)) ||
        (Math.abs(v.y - cy) < h * 0.22 && (Math.abs(v.x - minX) < w * 0.22 || Math.abs(v.x - maxX) < w * 0.22))
    ).length;

    if (midHits >= 3 && fillRatio < 0.65) {
      return {
        label: 'Elmas',
        points: buildShapePoints(
          'diamond',
          { x: minX, y: minY, pressure: 0.6 },
          { x: maxX, y: maxY, pressure: 0.6 }
        ),
      };
    }

    const aspect = Math.min(w, h) / Math.max(w, h);
    if (aspect > 0.78) {
      const side = (w + h) / 2;
      return {
        label: 'Kare',
        points: buildShapePoints(
          'rect',
          { x: cx - side / 2, y: cy - side / 2, pressure: 0.6 },
          { x: cx + side / 2, y: cy + side / 2, pressure: 0.6 }
        ),
      };
    }
    return {
      label: 'Dikdörtgen',
      points: buildShapePoints(
        'rect',
        { x: minX, y: minY, pressure: 0.6 },
        { x: maxX, y: maxY, pressure: 0.6 }
      ),
    };
  }

  // Hexagon
  if (vertices.length === 6 && fillRatio > 0.6) {
    return {
      label: 'Altıgen',
      points: buildShapePoints(
        'hexagon',
        { x: minX, y: minY, pressure: 0.6 },
        { x: maxX, y: maxY, pressure: 0.6 }
      ),
    };
  }

  // Star (8-12 alternating vertices)
  if (vertices.length >= 8 && vertices.length <= 12 && fillRatio < 0.58) {
    return {
      label: 'Yıldız',
      points: buildShapePoints(
        'star',
        { x: minX, y: minY, pressure: 0.6 },
        { x: maxX, y: maxY, pressure: 0.6 }
      ),
    };
  }

  return null;
}

export function drawCanvasStroke(
  ctx: CanvasRenderingContext2D,
  stroke: InkStroke,
  scaleX: number,
  scaleY: number,
  isSelected = false
) {
  const pts = stroke.points;
  if (pts.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke.color;

  const style =
    stroke.penStyle || (stroke.tool === 'highlighter' ? 'highlighter' : 'ballpoint');
  let opacity = stroke.opacity;
  if (style === 'pencil') opacity = Math.min(opacity, 0.78);
  if (style === 'brush') opacity = Math.min(opacity, 0.85);
  ctx.globalAlpha = opacity;

  const baseWidth =
    stroke.tool === 'highlighter'
      ? stroke.width * 2.6
      : style === 'marker'
      ? stroke.width * 1.9
      : style === 'brush'
      ? stroke.width * 2.2
      : style === 'watercolor'
      ? stroke.width * 3.1
      : style === 'crayon'
      ? stroke.width * 1.85
      : style === 'charcoal'
      ? stroke.width * 1.65
      : style === 'calligraphy'
      ? stroke.width * 2.1
      : style === 'fountain'
      ? stroke.width * 1.15
      : stroke.width;

  if (isSelected) {
    ctx.shadowColor = '#a3f0f0';
    ctx.shadowBlur = 8;
  }

  // Calligraphy flat angled nib (responds subtly to stylus tilt)
  if (style === 'calligraphy' && !stroke.filled) {
    const firstTilt = pts[0].tiltX ? (pts[0].tiltX * Math.PI) / 180 : 0;
    const nibAngle = -Math.PI / 5 + Math.max(-0.35, Math.min(0.35, firstTilt * 0.4));
    const nibW = Math.max(3, baseWidth * 0.72 * scaleX);
    const nx = Math.cos(nibAngle) * nibW;
    const ny = Math.sin(nibAngle) * nibW;
    ctx.fillStyle = stroke.color;
    if (pts.length === 1) {
      const p0 = pts[0];
      const pad = Math.max(1.5, baseWidth * 0.22 * scaleX);
      ctx.beginPath();
      ctx.moveTo(p0.x * scaleX - nx, p0.y * scaleY - ny - pad);
      ctx.lineTo(p0.x * scaleX + nx, p0.y * scaleY + ny - pad);
      ctx.lineTo(p0.x * scaleX + nx, p0.y * scaleY + ny + pad);
      ctx.lineTo(p0.x * scaleX - nx, p0.y * scaleY - ny + pad);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const pScale = p0.pressure ? 0.75 + p0.pressure * 0.5 : 1;
      ctx.beginPath();
      ctx.moveTo(p0.x * scaleX - nx * pScale, p0.y * scaleY - ny * pScale);
      ctx.lineTo(p0.x * scaleX + nx * pScale, p0.y * scaleY + ny * pScale);
      ctx.lineTo(p1.x * scaleX + nx * pScale, p1.y * scaleY + ny * pScale);
      ctx.lineTo(p1.x * scaleX - nx * pScale, p1.y * scaleY - ny * pScale);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  // Watercolor multi-wash brush
  if (style === 'watercolor' && !stroke.filled) {
    if (pts.length === 1) {
      const p0 = pts[0];
      ctx.fillStyle = stroke.color;
      for (const layer of [
        { alpha: 0.16, rad: baseWidth * 0.85 * scaleX },
        { alpha: 0.24, rad: baseWidth * 0.58 * scaleX },
        { alpha: 0.34, rad: baseWidth * 0.34 * scaleX },
      ]) {
        ctx.globalAlpha = opacity * layer.alpha;
        ctx.beginPath();
        ctx.arc(p0.x * scaleX, p0.y * scaleY, Math.max(1.5, layer.rad), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }
    const drawCurve = () => {
      ctx.beginPath();
      ctx.moveTo(pts[0].x * scaleX, pts[0].y * scaleY);
      for (let i = 1; i < pts.length - 1; i++) {
        const midX = ((pts[i].x + pts[i + 1].x) / 2) * scaleX;
        const midY = ((pts[i].y + pts[i + 1].y) / 2) * scaleY;
        ctx.quadraticCurveTo(pts[i].x * scaleX, pts[i].y * scaleY, midX, midY);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x * scaleX, last.y * scaleY);
    };
    ctx.globalAlpha = opacity * 0.16;
    ctx.lineWidth = baseWidth * 1.65 * scaleX;
    drawCurve();
    ctx.stroke();

    ctx.globalAlpha = opacity * 0.24;
    ctx.lineWidth = baseWidth * 1.12 * scaleX;
    drawCurve();
    ctx.stroke();

    ctx.globalAlpha = opacity * 0.34;
    ctx.lineWidth = baseWidth * 0.65 * scaleX;
    drawCurve();
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Crayon / Pastel & Charcoal textured strokes
  if ((style === 'crayon' || style === 'charcoal') && !stroke.filled) {
    ctx.fillStyle = stroke.color;
    const spread = (style === 'crayon' ? baseWidth * 0.62 : baseWidth * 0.48) * scaleX;
    const grains = style === 'crayon' ? 8 : 11;
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[i];
      const p1 = i < pts.length - 1 ? pts[i + 1] : p0;
      const steps = Math.max(1, Math.min(6, Math.ceil(Math.hypot(p1.x - p0.x, p1.y - p0.y) / 3)));
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const bx = p0.x + (p1.x - p0.x) * t;
        const by = p0.y + (p1.y - p0.y) * t;
        for (let k = 0; k < grains; k++) {
          const s1 = Math.sin(bx * 19.31 + by * 41.7 + k * 13.7) * 43758.5453;
          const s2 = Math.sin(bx * 73.17 + by * 11.9 + k * 29.3) * 24634.6345;
          const f1 = s1 - Math.floor(s1);
          const f2 = s2 - Math.floor(s2);
          const angle = f1 * Math.PI * 2;
          const rDist = f2 * spread;
          ctx.globalAlpha = opacity * (style === 'charcoal' ? 0.32 + f1 * 0.45 : 0.4 + f2 * 0.45);
          const dotSize = Math.max(1, (style === 'crayon' ? 1.5 : 1.1) * scaleX * (0.6 + f1));
          ctx.fillRect(
            bx * scaleX + Math.cos(angle) * rDist - dotSize / 2,
            by * scaleY + Math.sin(angle) * rDist - dotSize / 2,
            dotSize,
            dotSize
          );
        }
      }
    }
    ctx.restore();
    return;
  }

  // Rainbow spectrum brush
  if (style === 'rainbow' && !stroke.filled) {
    if (pts.length === 1) {
      ctx.fillStyle = 'hsl(0, 92%, 66%)';
      ctx.beginPath();
      ctx.arc(pts[0].x * scaleX, pts[0].y * scaleY, (baseWidth * 1.35 * scaleX) / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.lineWidth = baseWidth * 1.35 * scaleX;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      ctx.strokeStyle = `hsl(${(i * 9) % 360}, 92%, 66%)`;
      ctx.beginPath();
      ctx.moveTo(p0.x * scaleX, p0.y * scaleY);
      ctx.lineTo(p1.x * scaleX, p1.y * scaleY);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // Pearl / Dotted bead brush
  if (style === 'dottedLine' && !stroke.filled) {
    ctx.fillStyle = stroke.color;
    const minSpacing = Math.max(8, baseWidth * 2.1);
    let acc = minSpacing;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (i > 0) {
        acc += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
      }
      if (acc >= minSpacing) {
        acc = 0;
        ctx.beginPath();
        ctx.arc(p.x * scaleX, p.y * scaleY, Math.max(1.8, baseWidth * 0.65 * scaleX), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    return;
  }

  // Spray brush (deterministic stippling based on point coords)
  if (style === 'spray') {
    ctx.fillStyle = stroke.color;
    const rad = Math.max(6, baseWidth * 2.1 * scaleX);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      for (let k = 0; k < 9; k++) {
        const seed = Math.sin(p.x * 12.9898 + p.y * 78.233 + k * 43.12) * 43758.5453;
        const frac1 = seed - Math.floor(seed);
        const seed2 = Math.sin(p.x * 93.123 + p.y * 19.45 + k * 17.7) * 24634.6345;
        const frac2 = seed2 - Math.floor(seed2);
        const angle = frac1 * Math.PI * 2;
        const dist = Math.sqrt(frac2) * rad;
        const dotR = Math.max(0.9, (0.8 + frac1 * 1.3) * scaleX);
        ctx.beginPath();
        ctx.arc(
          p.x * scaleX + Math.cos(angle) * dist,
          p.y * scaleY + Math.sin(angle) * dist,
          dotR,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
    ctx.restore();
    return;
  }

  // Neon glow pen
  if (style === 'neon') {
    const drawCurve = () => {
      ctx.beginPath();
      ctx.moveTo(pts[0].x * scaleX, pts[0].y * scaleY);
      for (let i = 1; i < pts.length - 1; i++) {
        const midX = ((pts[i].x + pts[i + 1].x) / 2) * scaleX;
        const midY = ((pts[i].y + pts[i + 1].y) / 2) * scaleY;
        ctx.quadraticCurveTo(pts[i].x * scaleX, pts[i].y * scaleY, midX, midY);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x * scaleX, last.y * scaleY);
    };

    ctx.strokeStyle = stroke.color;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = baseWidth * 2.8 * scaleX;
    drawCurve();
    ctx.stroke();

    ctx.globalAlpha = 0.5;
    ctx.lineWidth = baseWidth * 1.65 * scaleX;
    drawCurve();
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.96;
    ctx.lineWidth = Math.max(1.2, baseWidth * 0.65 * scaleX);
    drawCurve();
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (style === 'dashed' || stroke.dashStyle === 'dashed') {
    ctx.setLineDash([baseWidth * 2.4 * scaleX, baseWidth * 1.8 * scaleX]);
  } else if (stroke.dashStyle === 'dotted') {
    ctx.setLineDash([0.5 * scaleX, baseWidth * 2.1 * scaleX]);
  }

  if (pts.length === 1) {
    ctx.beginPath();
    ctx.fillStyle = stroke.color;
    ctx.arc(
      pts[0].x * scaleX,
      pts[0].y * scaleY,
      (baseWidth * scaleX) / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
    return;
  }

  if ((style === 'fountain' || style === 'brush' || style === 'pencil') && pts.length > 2 && !stroke.filled) {
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      const speedFactor =
        style === 'brush'
          ? Math.max(0.5, Math.min(1.45, 1.35 - dist / 42))
          : style === 'fountain'
          ? Math.max(0.65, Math.min(1.35, 1.25 - dist / 45))
          : 1;
      const tiltMag =
        style === 'pencil' && (p0.tiltX || p0.tiltY)
          ? Math.min(1.9, 1 + Math.hypot(p0.tiltX || 0, p0.tiltY || 0) / 55)
          : 1;
      const pressureFactor = p0.pressure ? 0.68 + p0.pressure * 0.64 : 1;
      ctx.beginPath();
      ctx.lineWidth = baseWidth * scaleX * speedFactor * pressureFactor * tiltMag;
      ctx.moveTo(p0.x * scaleX, p0.y * scaleY);
      ctx.lineTo(p1.x * scaleX, p1.y * scaleY);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // Pressure-sensitive S Pen ink: a subtle, stable width response for the
  // standard ballpoint, without changing the stored vector points.
  if (style === 'ballpoint' && pts.length > 1 && !stroke.filled) {
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const pressure0 = Number.isFinite(p0.pressure) ? p0.pressure : 0.5;
      const pressure1 = Number.isFinite(p1.pressure) ? p1.pressure : pressure0;
      const pressure = Math.max(0, Math.min(1, (pressure0 + pressure1) / 2));
      const pressureWidth = Math.max(0.55, Math.min(1.7, 0.55 + pressure * 1.15));
      ctx.lineWidth = baseWidth * scaleX * pressureWidth;
      ctx.beginPath();
      ctx.moveTo(p0.x * scaleX, p0.y * scaleY);
      ctx.lineTo(p1.x * scaleX, p1.y * scaleY);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  ctx.lineWidth = baseWidth * scaleX;
  ctx.beginPath();
  ctx.moveTo(pts[0].x * scaleX, pts[0].y * scaleY);

  if (stroke.filled) {
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x * scaleX, pts[i].y * scaleY);
    }
    ctx.closePath();
    ctx.save();
    ctx.globalAlpha = opacity * 0.28;
    ctx.fillStyle = stroke.color;
    ctx.fill();
    ctx.restore();
    ctx.stroke();
    ctx.restore();
    return;
  }

  for (let i = 1; i < pts.length - 1; i++) {
    const midX = ((pts[i].x + pts[i + 1].x) / 2) * scaleX;
    const midY = ((pts[i].y + pts[i + 1].y) / 2) * scaleY;
    ctx.quadraticCurveTo(pts[i].x * scaleX, pts[i].y * scaleY, midX, midY);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last.x * scaleX, last.y * scaleY);
  ctx.stroke();
  ctx.restore();
}

export interface LaserTrailPoint {
  x: number;
  y: number;
  t: number;
}

export function drawLaserTrail(
  ctx: CanvasRenderingContext2D,
  points: LaserTrailPoint[],
  color: string,
  scale: number,
  nowMs: number,
  ttlMs = 1400
) {
  if (points.length === 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const age = nowMs - p1.t;
    if (age > ttlMs) continue;
    const life = Math.max(0, 1 - age / ttlMs);

    // Outer laser glow
    ctx.strokeStyle = color;
    ctx.globalAlpha = life * 0.35;
    ctx.lineWidth = (10 * life + 3) * scale;
    ctx.beginPath();
    ctx.moveTo(p0.x * scale, p0.y * scale);
    ctx.lineTo(p1.x * scale, p1.y * scale);
    ctx.stroke();

    // Inner bright core
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = life * 0.92;
    ctx.lineWidth = (3.5 * life + 1.2) * scale;
    ctx.beginPath();
    ctx.moveTo(p0.x * scale, p0.y * scale);
    ctx.lineTo(p1.x * scale, p1.y * scale);
    ctx.stroke();
  }

  // Glowing laser dot at head
  const head = points[points.length - 1];
  const headAge = nowMs - head.t;
  if (headAge <= ttlMs) {
    const headLife = Math.max(0, 1 - headAge / ttlMs);
    ctx.fillStyle = color;
    ctx.globalAlpha = headLife * 0.32;
    ctx.beginPath();
    ctx.arc(head.x * scale, head.y * scale, 16 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = headLife * 0.72;
    ctx.beginPath();
    ctx.arc(head.x * scale, head.y * scale, 9 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = headLife;
    ctx.beginPath();
    ctx.arc(head.x * scale, head.y * scale, 4.5 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawCanvasStamp(
  ctx: CanvasRenderingContext2D,
  stamp: CanvasStamp,
  scaleX: number,
  scaleY: number
) {
  const cx = stamp.x * scaleX;
  const cy = stamp.y * scaleY;
  const r = (stamp.size * scaleX) / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = stamp.color;
  ctx.fillStyle = stamp.color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Soft badge disc background
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.lineWidth = Math.max(2, r * 0.16);
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
  ctx.stroke();

  if (stamp.kind === 'check') {
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, 0);
    ctx.lineTo(-r * 0.1, r * 0.36);
    ctx.lineTo(r * 0.5, -r * 0.36);
    ctx.stroke();
  } else if (stamp.kind === 'star') {
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const rr = i % 2 === 0 ? r * 0.68 : r * 0.3;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  } else if (stamp.kind === 'heart') {
    ctx.beginPath();
    const s = r * 0.55;
    ctx.moveTo(0, s * 0.7);
    ctx.bezierCurveTo(-s * 1.3, -s * 0.15, -s * 0.65, -s * 1.05, 0, -s * 0.35);
    ctx.bezierCurveTo(s * 0.65, -s * 1.05, s * 1.3, -s * 0.15, 0, s * 0.7);
    ctx.fill();
  } else if (stamp.kind === 'target') {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
  } else if (stamp.kind === 'alert') {
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.52);
    ctx.lineTo(0, r * 0.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, r * 0.48, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (stamp.kind === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, 0);
    ctx.lineTo(r * 0.5, 0);
    ctx.moveTo(r * 0.12, -r * 0.38);
    ctx.lineTo(r * 0.52, 0);
    ctx.lineTo(r * 0.12, r * 0.38);
    ctx.stroke();
  } else if (stamp.kind === 'idea') {
    ctx.beginPath();
    ctx.arc(0, -r * 0.12, r * 0.38, Math.PI * 0.75, Math.PI * 2.25);
    ctx.lineTo(r * 0.18, r * 0.35);
    ctx.lineTo(-r * 0.18, r * 0.35);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.14, r * 0.55);
    ctx.lineTo(r * 0.14, r * 0.55);
    ctx.stroke();
  } else if (stamp.kind === 'pin') {
    ctx.beginPath();
    ctx.arc(0, -r * 0.2, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, r * 0.1);
    ctx.lineTo(0, r * 0.62);
    ctx.stroke();
  }

  ctx.restore();
}
