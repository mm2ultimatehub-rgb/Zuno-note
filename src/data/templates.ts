import {
  CanvasTextBox,
  InkStroke,
  PaperPattern,
  PaperTheme,
  StrokePoint,
} from '../types/notes';

export type TemplateCategory = 'all' | 'plan' | 'study' | 'work' | 'life' | 'sketch';

export type TemplatePreviewKind =
  | 'blank'
  | 'ruled'
  | 'grid'
  | 'dotted'
  | 'weekly'
  | 'monthly'
  | 'daily'
  | 'meeting'
  | 'cornell'
  | 'mindmap'
  | 'kanban'
  | 'swot'
  | 'timetable'
  | 'vocab'
  | 'music'
  | 'budget'
  | 'fitness'
  | 'habit'
  | 'reading'
  | 'code'
  | 'sketchLight';

export interface NoteTemplate {
  id: string;
  title: string;
  subtitle: string;
  category: Exclude<TemplateCategory, 'all'>;
  previewKind: TemplatePreviewKind;
  paperTheme: PaperTheme;
  paperPattern: PaperPattern;
  accentColor: string;
  isMonospace?: boolean;
  tags: string[];
  content: string;
  checklistDefaults?: string[];
  strokes?: Omit<InkStroke, 'id'>[];
  textBoxes?: Omit<CanvasTextBox, 'id'>[];
}

function pt(x: number, y: number): StrokePoint {
  return { x, y, pressure: 0.6 };
}

function lineStroke(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 2.5,
  opacity = 0.55
): Omit<InkStroke, 'id'> {
  return {
    tool: 'pen',
    penStyle: 'ballpoint',
    dashStyle: 'solid',
    color,
    width,
    opacity,
    points: [pt(x1, y1), pt(x2, y2)],
  };
}

function rectStroke(
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  width = 2.5,
  opacity = 0.5,
  filled = false
): Omit<InkStroke, 'id'> {
  return {
    tool: 'pen',
    penStyle: 'ballpoint',
    dashStyle: 'solid',
    color,
    width,
    opacity,
    filled,
    points: [pt(x, y), pt(x + w, y), pt(x + w, y + h), pt(x, y + h), pt(x, y)],
  };
}

function circleStroke(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
  width = 2.5,
  opacity = 0.6,
  filled = false
): Omit<InkStroke, 'id'> {
  const steps = 36;
  const points: StrokePoint[] = Array.from({ length: steps + 1 }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    return pt(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
  });
  return {
    tool: 'pen',
    penStyle: 'ballpoint',
    dashStyle: 'solid',
    color,
    width,
    opacity,
    filled,
    points,
  };
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'tpl_mindmap',
    title: 'Zihin Haritası',
    subtitle: 'Merkez fikir, dallar ve serbest düşünce düğümleri',
    category: 'study',
    previewKind: 'mindmap',
    paperTheme: 'amoled',
    paperPattern: 'dotted',
    accentColor: '#a3f0f0',
    tags: ['fikir', 'harita'],
    content: '',
    strokes: [
      circleStroke(430, 560, 105, 58, '#a3f0f0', 3, 0.8, true),
      lineStroke(345, 515, 220, 395, '#ffb454', 2.6, 0.7),
      lineStroke(515, 515, 640, 395, '#9ccaff', 2.6, 0.7),
      lineStroke(345, 605, 220, 745, '#a6f0a6', 2.6, 0.7),
      lineStroke(515, 605, 640, 745, '#ff9db8', 2.6, 0.7),
      rectStroke(70, 310, 210, 110, '#ffb454', 2.4, 0.65),
      rectStroke(580, 310, 210, 110, '#9ccaff', 2.4, 0.65),
      rectStroke(70, 710, 210, 110, '#a6f0a6', 2.4, 0.65),
      rectStroke(580, 710, 210, 110, '#ff9db8', 2.4, 0.65),
    ],
    textBoxes: [
      { x: 350, y: 536, width: 160, text: 'ANA KONU', fontSize: 18, bold: true, color: '#a3f0f0' },
      { x: 84, y: 326, width: 182, text: '1. Alt Başlık\n• ', fontSize: 15, bold: true, color: '#ffb454' },
      { x: 594, y: 326, width: 182, text: '2. Alt Başlık\n• ', fontSize: 15, bold: true, color: '#9ccaff' },
      { x: 84, y: 726, width: 182, text: '3. Alt Başlık\n• ', fontSize: 15, bold: true, color: '#a6f0a6' },
      { x: 594, y: 726, width: 182, text: '4. Alt Başlık\n• ', fontSize: 15, bold: true, color: '#ff9db8' },
    ],
  },
  {
    id: 'tpl_kanban',
    title: 'Kanban Proje Panosu',
    subtitle: '3 sütunlu akış: Yapılacak, Süreçte, Bitti',
    category: 'work',
    previewKind: 'kanban',
    paperTheme: 'amoled',
    paperPattern: 'blank',
    accentColor: '#9ccaff',
    tags: ['proje', 'iş'],
    content: '',
    strokes: [
      rectStroke(40, 250, 245, 720, '#ffb454', 2.4, 0.5),
      lineStroke(40, 305, 285, 305, '#ffb454', 2, 0.45),
      rectStroke(307, 250, 245, 720, '#9ccaff', 2.4, 0.5),
      lineStroke(307, 305, 552, 305, '#9ccaff', 2, 0.45),
      rectStroke(575, 250, 245, 720, '#a6f0a6', 2.4, 0.5),
      lineStroke(575, 305, 820, 305, '#a6f0a6', 2, 0.45),
    ],
    textBoxes: [
      { x: 54, y: 264, width: 216, text: 'YAPILACAKLAR', fontSize: 15, bold: true, color: '#ffb454' },
      { x: 54, y: 324, width: 216, text: '• Görev 1\n• Görev 2', fontSize: 14, color: '#e6f2f2' },
      { x: 321, y: 264, width: 216, text: 'DEVAM EDİYOR', fontSize: 15, bold: true, color: '#9ccaff' },
      { x: 321, y: 324, width: 216, text: '• Aktif iş', fontSize: 14, color: '#e6f2f2' },
      { x: 589, y: 264, width: 216, text: 'TAMAMLANDI', fontSize: 15, bold: true, color: '#a6f0a6' },
      { x: 589, y: 324, width: 216, text: '✓ Teslim edildi', fontSize: 14, color: '#e6f2f2' },
    ],
  },
  {
    id: 'tpl_swot',
    title: 'SWOT Analiz Tablosu',
    subtitle: '4 bölgeli güçlü, zayıf, fırsat ve tehdit analizi',
    category: 'work',
    previewKind: 'swot',
    paperTheme: 'amoled',
    paperPattern: 'dotted',
    accentColor: '#cdb4ff',
    tags: ['analiz', 'strateji'],
    content: '',
    strokes: [
      rectStroke(45, 250, 770, 720, '#84a0a0', 2.5, 0.45),
      lineStroke(430, 250, 430, 970, '#84a0a0', 2.4, 0.45),
      lineStroke(45, 610, 815, 610, '#84a0a0', 2.4, 0.45),
    ],
    textBoxes: [
      { x: 64, y: 268, width: 345, text: 'GÜÇLÜ YÖNLER (S)\n• ', fontSize: 16, bold: true, color: '#a6f0a6' },
      { x: 450, y: 268, width: 345, text: 'ZAYIF YÖNLER (W)\n• ', fontSize: 16, bold: true, color: '#ffb454' },
      { x: 64, y: 628, width: 345, text: 'FIRSATLAR (O)\n• ', fontSize: 16, bold: true, color: '#9ccaff' },
      { x: 450, y: 628, width: 345, text: 'TEHDİTLER (T)\n• ', fontSize: 16, bold: true, color: '#ff9db8' },
    ],
  },
  {
    id: 'tpl_weekly_plan',
    title: 'Haftalık Planlayıcı',
    subtitle: '7 günlük blok düzeni & haftalık öncelikler',
    category: 'plan',
    previewKind: 'weekly',
    paperTheme: 'amoled',
    paperPattern: 'dotted',
    accentColor: '#a3f0f0',
    tags: ['plan', 'haftalık'],
    content: '',
    strokes: [
      rectStroke(44, 240, 376, 175, '#a3f0f0', 2.2, 0.45),
      rectStroke(440, 240, 376, 175, '#a3f0f0', 2.2, 0.45),
      rectStroke(44, 432, 376, 175, '#a3f0f0', 2.2, 0.45),
      rectStroke(440, 432, 376, 175, '#a3f0f0', 2.2, 0.45),
      rectStroke(44, 624, 376, 175, '#a3f0f0', 2.2, 0.45),
      rectStroke(440, 624, 376, 175, '#a3f0f0', 2.2, 0.45),
      rectStroke(44, 816, 376, 175, '#ffb454', 2.2, 0.55),
      rectStroke(440, 816, 376, 175, '#a6f0a6', 2.2, 0.55),
    ],
    textBoxes: [
      { x: 58, y: 254, width: 344, text: 'PAZARTESİ\n• ', fontSize: 14, bold: true, color: '#a3f0f0' },
      { x: 454, y: 254, width: 344, text: 'SALI\n• ', fontSize: 14, bold: true, color: '#a3f0f0' },
      { x: 58, y: 446, width: 344, text: 'ÇARŞAMBA\n• ', fontSize: 14, bold: true, color: '#a3f0f0' },
      { x: 454, y: 446, width: 344, text: 'PERŞEMBE\n• ', fontSize: 14, bold: true, color: '#a3f0f0' },
      { x: 58, y: 638, width: 344, text: 'CUMA\n• ', fontSize: 14, bold: true, color: '#a3f0f0' },
      { x: 454, y: 638, width: 344, text: 'CUMARTESİ\n• ', fontSize: 14, bold: true, color: '#a3f0f0' },
      { x: 58, y: 830, width: 344, text: 'PAZAR\n• ', fontSize: 14, bold: true, color: '#ffb454' },
      { x: 454, y: 830, width: 344, text: 'HAFTANIN NOTLARI\n• ', fontSize: 14, bold: true, color: '#a6f0a6' },
    ],
    checklistDefaults: ['Haftanın 1 numaralı hedefi', 'Spor / Sağlık rutini'],
  },
  {
    id: 'tpl_monthly_cal',
    title: 'Aylık Takvim Grid',
    subtitle: '7×5 aylık planlama ve önemli günler tablosu',
    category: 'plan',
    previewKind: 'monthly',
    paperTheme: 'amoled',
    paperPattern: 'blank',
    accentColor: '#ffb454',
    tags: ['takvim', 'aylık'],
    content: '## Ay / Yıl: ',
    strokes: [
      rectStroke(45, 270, 770, 680, '#ffb454', 2.4, 0.55),
      ...[1, 2, 3, 4, 5, 6].map((c) =>
        lineStroke(45 + c * 110, 270, 45 + c * 110, 950, '#84a0a0', 1.8, 0.4)
      ),
      ...[1, 2, 3, 4].map((r) =>
        lineStroke(45, 270 + r * 136, 815, 270 + r * 136, '#84a0a0', 1.8, 0.4)
      ),
    ],
    textBoxes: [
      { x: 55, y: 235, width: 96, text: 'Pzt', fontSize: 14, bold: true, color: '#ffb454' },
      { x: 165, y: 235, width: 96, text: 'Sal', fontSize: 14, bold: true, color: '#ffb454' },
      { x: 275, y: 235, width: 96, text: 'Çar', fontSize: 14, bold: true, color: '#ffb454' },
      { x: 385, y: 235, width: 96, text: 'Per', fontSize: 14, bold: true, color: '#ffb454' },
      { x: 495, y: 235, width: 96, text: 'Cum', fontSize: 14, bold: true, color: '#ffb454' },
      { x: 605, y: 235, width: 96, text: 'Cmt', fontSize: 14, bold: true, color: '#a3f0f0' },
      { x: 715, y: 235, width: 96, text: 'Paz', fontSize: 14, bold: true, color: '#ff9db8' },
    ],
  },
  {
    id: 'tpl_daily_schedule',
    title: 'Günlük Zaman Akışı',
    subtitle: 'Sabah-akşam saatlik plan & günün öncelikleri',
    category: 'plan',
    previewKind: 'daily',
    paperTheme: 'amoled',
    paperPattern: 'ruled',
    accentColor: '#ffb454',
    tags: ['günlük', 'plan'],
    content:
      '## Günün Öncelikleri\n• \n\n### Saatlik Akış\n08:00 — Sabah rutini\n10:00 — Derin odak bloğu\n13:00 — Öğle molası\n15:00 — Görüşmeler / Ders\n18:00 — Gün değerlendirmesi',
    checklistDefaults: ['En önemli iş (MIT)', '2 litre su', 'Günün kısa özeti'],
  },
  {
    id: 'tpl_cornell',
    title: 'Cornell Ders Notu',
    subtitle: 'Çizgili ipucu sütunu, detaylı notlar ve alt özet',
    category: 'study',
    previewKind: 'cornell',
    paperTheme: 'amoled',
    paperPattern: 'ruled',
    accentColor: '#9ccaff',
    tags: ['ders', 'cornell'],
    content: '# Ders / Konu Başlığı',
    strokes: [
      lineStroke(45, 255, 815, 255, '#9ccaff', 2.4, 0.55),
      lineStroke(275, 255, 275, 835, '#9ccaff', 2.2, 0.55),
      lineStroke(45, 835, 815, 835, '#9ccaff', 2.4, 0.55),
    ],
    textBoxes: [
      {
        x: 52,
        y: 270,
        width: 210,
        text: 'ANAHTAR KAVRAMLAR\n• Soru 1?\n• Tanım:',
        fontSize: 14,
        bold: true,
        color: '#9ccaff',
      },
      {
        x: 292,
        y: 270,
        width: 510,
        text: 'DETAYLI DERS NOTLARI\n• ',
        fontSize: 15,
        color: '#e6f2f2',
      },
      {
        x: 52,
        y: 850,
        width: 745,
        text: 'SAYFA ÖZETİ: ',
        fontSize: 15,
        bold: true,
        color: '#a3f0f0',
      },
    ],
    checklistDefaults: ['Tekrar edildi', 'Örnek sorular çözüldü'],
  },
  {
    id: 'tpl_lesson_schedule',
    title: 'Haftalık Ders Programı',
    subtitle: 'Saat ve gün tablosuyla okul veya çalışma çizelgesi',
    category: 'study',
    previewKind: 'timetable',
    paperTheme: 'amoled',
    paperPattern: 'blank',
    accentColor: '#67e8f9',
    tags: ['ders', 'program'],
    content: '',
    strokes: [
      rectStroke(40, 260, 780, 680, '#67e8f9', 2.4, 0.5),
      ...[140, 276, 412, 548, 684].map((x) =>
        lineStroke(x, 260, x, 940, '#84a0a0', 1.8, 0.4)
      ),
      ...[320, 444, 568, 692, 816].map((y) =>
        lineStroke(40, y, 820, y, '#84a0a0', 1.8, 0.4)
      ),
    ],
    textBoxes: [
      { x: 50, y: 278, width: 82, text: 'SAAT', fontSize: 13, bold: true, color: '#67e8f9' },
      { x: 150, y: 278, width: 118, text: 'Pazartesi', fontSize: 13, bold: true, color: '#e6f2f2' },
      { x: 286, y: 278, width: 118, text: 'Salı', fontSize: 13, bold: true, color: '#e6f2f2' },
      { x: 422, y: 278, width: 118, text: 'Çarşamba', fontSize: 13, bold: true, color: '#e6f2f2' },
      { x: 558, y: 278, width: 118, text: 'Perşembe', fontSize: 13, bold: true, color: '#e6f2f2' },
      { x: 694, y: 278, width: 118, text: 'Cuma', fontSize: 13, bold: true, color: '#e6f2f2' },
      { x: 48, y: 340, width: 86, text: '09:00', fontSize: 13, color: '#84a0a0' },
      { x: 48, y: 464, width: 86, text: '11:00', fontSize: 13, color: '#84a0a0' },
      { x: 48, y: 588, width: 86, text: '13:30', fontSize: 13, color: '#84a0a0' },
      { x: 48, y: 712, width: 86, text: '15:30', fontSize: 13, color: '#84a0a0' },
      { x: 48, y: 836, width: 86, text: '17:30', fontSize: 13, color: '#84a0a0' },
    ],
  },
  {
    id: 'tpl_vocab_cards',
    title: 'Dil & Kelime Kartları',
    subtitle: 'Kelime, telaffuz ve örnek cümle kutucukları',
    category: 'study',
    previewKind: 'vocab',
    paperTheme: 'amoled',
    paperPattern: 'dotted',
    accentColor: '#a6f0a6',
    tags: ['dil', 'kelime'],
    content: '',
    strokes: [
      rectStroke(45, 250, 370, 210, '#a6f0a6', 2.2, 0.55),
      rectStroke(445, 250, 370, 210, '#a3f0f0', 2.2, 0.55),
      rectStroke(45, 485, 370, 210, '#ffb454', 2.2, 0.55),
      rectStroke(445, 485, 370, 210, '#9ccaff', 2.2, 0.55),
      rectStroke(45, 720, 370, 210, '#ff9db8', 2.2, 0.55),
      rectStroke(445, 720, 370, 210, '#cdb4ff', 2.2, 0.55),
    ],
    textBoxes: [
      { x: 60, y: 268, width: 340, text: 'Kelime 1:\nAnlamı:\nÖrnek:', fontSize: 14, color: '#e6f2f2' },
      { x: 460, y: 268, width: 340, text: 'Kelime 2:\nAnlamı:\nÖrnek:', fontSize: 14, color: '#e6f2f2' },
      { x: 60, y: 503, width: 340, text: 'Kelime 3:\nAnlamı:\nÖrnek:', fontSize: 14, color: '#e6f2f2' },
      { x: 460, y: 503, width: 340, text: 'Kelime 4:\nAnlamı:\nÖrnek:', fontSize: 14, color: '#e6f2f2' },
      { x: 60, y: 738, width: 340, text: 'Kelime 5:\nAnlamı:\nÖrnek:', fontSize: 14, color: '#e6f2f2' },
      { x: 460, y: 738, width: 340, text: 'Kelime 6:\nAnlamı:\nÖrnek:', fontSize: 14, color: '#e6f2f2' },
    ],
  },
  {
    id: 'tpl_music_staff',
    title: 'Müzik & Nota Defteri',
    subtitle: '5 dizekli porte çizgileriyle beste ve solfej sayfası',
    category: 'sketch',
    previewKind: 'music',
    paperTheme: 'amoled',
    paperPattern: 'blank',
    accentColor: '#cdb4ff',
    tags: ['müzik', 'nota'],
    content: '## Parça Adı / Tempo: ',
    strokes: [0, 1, 2, 3, 4].flatMap((staffIdx) => {
      const baseY = 260 + staffIdx * 155;
      return [0, 1, 2, 3, 4].map((lineIdx) =>
        lineStroke(50, baseY + lineIdx * 18, 810, baseY + lineIdx * 18, '#cdb4ff', 1.6, 0.55)
      );
    }),
  },
  {
    id: 'tpl_budget',
    title: 'Bütçe & Harcama Tablosu',
    subtitle: 'Gelir, gider, birikim ve ödeme kontrol listesi',
    category: 'life',
    previewKind: 'budget',
    paperTheme: 'amoled',
    paperPattern: 'ruled',
    accentColor: '#a6f0a6',
    tags: ['bütçe', 'finans'],
    content: '## Aylık Bütçe Özeti\n• Toplam Gelir:\n• Hedef Birikim:',
    strokes: [
      rectStroke(45, 290, 370, 560, '#a6f0a6', 2.2, 0.5),
      rectStroke(445, 290, 370, 560, '#ff9db8', 2.2, 0.5),
      lineStroke(45, 345, 415, 345, '#a6f0a6', 1.8, 0.45),
      lineStroke(445, 345, 815, 345, '#ff9db8', 1.8, 0.45),
    ],
    textBoxes: [
      { x: 60, y: 304, width: 340, text: 'GELİRLER (+)', fontSize: 15, bold: true, color: '#a6f0a6' },
      { x: 60, y: 362, width: 340, text: '• Maaş / Ek Gelir:', fontSize: 14, color: '#e6f2f2' },
      { x: 460, y: 304, width: 340, text: 'GİDERLER (-)', fontSize: 15, bold: true, color: '#ff9db8' },
      { x: 460, y: 362, width: 340, text: '• Kira / Faturalar:\n• Market:', fontSize: 14, color: '#e6f2f2' },
    ],
    checklistDefaults: ['Faturalar ödendi', 'Birikim kenara ayrıldı'],
  },
  {
    id: 'tpl_fitness',
    title: 'Antrenman & Sağlık',
    subtitle: 'Egzersiz setleri, su takibi ve günlük form notu',
    category: 'life',
    previewKind: 'fitness',
    paperTheme: 'amoled',
    paperPattern: 'dotted',
    accentColor: '#ff9db8',
    tags: ['spor', 'sağlık'],
    content:
      '## Günün Antrenmanı\n• Isınma (10 dk):\n• Ana Seri (Set × Tekrar):\n• Kardiyo / Esneme:',
    checklistDefaults: ['Isınma tamamlandı', '2.5L su hedefi', 'Protein & uyku dengesi'],
  },
  {
    id: 'tpl_meeting',
    title: 'Toplantı Tutanağı',
    subtitle: 'Katılımcılar, gündem, kararlar ve aksiyon adımları',
    category: 'work',
    previewKind: 'meeting',
    paperTheme: 'amoled',
    paperPattern: 'ruled',
    accentColor: '#cdb4ff',
    tags: ['toplantı', 'iş'],
    content:
      '## Toplantı Bilgileri\n• Tarih / Konu:\n• Katılımcılar:\n\n## Gündem Maddeleri\n1. \n2. \n\n## Alınan Kararlar\n• ',
    checklistDefaults: ['Aksiyon planını ekiple paylaş', 'Sonraki toplantı tarihini belirle'],
  },
  {
    id: 'tpl_habit',
    title: 'Alışkanlık & Rutin Takibi',
    subtitle: 'Günlük rutin kutuları ve motivasyon notu',
    category: 'life',
    previewKind: 'habit',
    paperTheme: 'amoled',
    paperPattern: 'dotted',
    accentColor: '#a6f0a6',
    tags: ['alışkanlık', 'hedef'],
    content: '## Bu Haftanın Alışkanlıkları\n> Küçük adımlar her gün tekrarlandığında kalıcı sonuçlar doğurur.\n',
    checklistDefaults: [
      '20 dakika kitap okuma',
      '2 litre su içme',
      '30 dakika yürüyüş / hareket',
      'Uyku öncesi ekran molası',
    ],
  },
  {
    id: 'tpl_reading',
    title: 'Kitap & Film Özeti',
    subtitle: 'Alıntılar, yıldızlı puanlama ve kişisel yorum',
    category: 'life',
    previewKind: 'reading',
    paperTheme: 'charcoal',
    paperPattern: 'ruled',
    accentColor: '#ff9db8',
    tags: ['kitap', 'özet'],
    content:
      '# Eser Adı\n**Yazar / Yönetmen:** \n**Puanım:** ★★★★★\n\n### Öne Çıkan Alıntılar\n> ""\n\n### Kişisel Notlar & Çıkarımlar\n• ',
  },
  {
    id: 'tpl_code_arch',
    title: 'Kod & Proje Mimarisi',
    subtitle: 'Teknik notlar, algoritma eskizi & sprint görevleri',
    category: 'work',
    previewKind: 'code',
    paperTheme: 'charcoal',
    paperPattern: 'grid',
    accentColor: '#67e8f9',
    isMonospace: true,
    tags: ['kod', 'proje'],
    content:
      '# Proje / Modül Adı\n\n```\n// Kısa mimari veya algoritma özeti\n```\n\n### Teknik Notlar\n• ',
    checklistDefaults: ['Gereksinimler netleştirildi', 'Testler çalıştırıldı'],
  },
  {
    id: 'tpl_grid_math',
    title: 'Koordinatlı Matematik',
    subtitle: 'Kareli zemin üzerinde hazır X-Y koordinat ekseni',
    category: 'study',
    previewKind: 'grid',
    paperTheme: 'amoled',
    paperPattern: 'grid',
    accentColor: '#a3f0f0',
    tags: ['matematik', 'çizim'],
    content: '',
    strokes: [
      lineStroke(430, 260, 430, 920, '#a3f0f0', 2.4, 0.65),
      lineStroke(110, 590, 750, 590, '#a3f0f0', 2.4, 0.65),
      lineStroke(420, 275, 430, 260, '#a3f0f0', 2.4, 0.65),
      lineStroke(440, 275, 430, 260, '#a3f0f0', 2.4, 0.65),
      lineStroke(735, 580, 750, 590, '#a3f0f0', 2.4, 0.65),
      lineStroke(735, 600, 750, 590, '#a3f0f0', 2.4, 0.65),
    ],
  },
  {
    id: 'tpl_dotted_bujo',
    title: 'Noktalı Bullet Defter',
    subtitle: 'Serbest tasarım ve nokta kılavuzlu yaratıcı sayfa',
    category: 'sketch',
    previewKind: 'dotted',
    paperTheme: 'amoled',
    paperPattern: 'dotted',
    accentColor: '#fde047',
    tags: ['tasarım'],
    content: '',
  },
  {
    id: 'tpl_sketch_light',
    title: 'Açık Kağıt Eskiz',
    subtitle: 'Yüksek kontrastlı açık renkli çizim sayfası',
    category: 'sketch',
    previewKind: 'sketchLight',
    paperTheme: 'paper',
    paperPattern: 'dotted',
    accentColor: '#38bdf8',
    tags: ['eskiz'],
    content: '',
  },
  {
    id: 'tpl_blank_dark',
    title: 'Boş Koyu Tuval',
    subtitle: 'Sınırsız özgür yazı, medya ve çizim alanı',
    category: 'sketch',
    previewKind: 'blank',
    paperTheme: 'amoled',
    paperPattern: 'blank',
    accentColor: '#a3f0f0',
    tags: [],
    content: '',
  },
];
