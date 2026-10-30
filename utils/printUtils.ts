/**
 * نظام موحد للطباعة في تطبيق مركز الهداية الطبي
 * يدعم الطباعة النظيفة عبر Hidden iFrame مع عزل عناصر الواجهة
 */

export interface PrintHeaderOptions {
  title: string;
  subtitle?: string;
  documentCode?: string;
  date?: string;
}

const INTERNAL_PRINT_VALUE_MAP: Record<string, string> = {
  // Water & Sanitation & Housing
  public: 'شبكة عامة',
  public_network: 'شبكة عامة',
  sanitary: 'صرف صحي آمن / شبكة عامة',
  septic: 'بيارة / خزان أرضي',
  trench: 'طرنش / حفرة تقليدية',
  well: 'بئر / طلمبة',
  tank: 'خزان مياه',
  bottled: 'مياه معبأة',
  good: 'جيدة',
  poor: 'ضعيفة / سيئة',
  bad: 'سيئة',
  fair: 'متوسطة',
  moderate: 'متوسطة',
  average: 'متوسطة',
  excellent: 'ممتازة',
  adequate: 'كافية / مناسبة',
  inadequate: 'غير كافية',
  owned: 'ملك',
  owner: 'ملك',
  rent: 'إيجار',
  rented: 'إيجار',
  shared: 'مشترك / عائلي',
  hosted: 'استضافة',
  concrete: 'خرسانة مسلحة',
  brick: 'طوب أحمر',
  mud: 'طوب لبن / ريفي',
  wood: 'خشب / عريش',
  apartment: 'شقة سكنية',
  house: 'منزل مستقل',
  rural_house: 'منزل ريفي',
  inside: 'داخل المسكن',
  outside: 'خارج المسكن',
  electricity: 'شبكة كهرباء عامة',
  generator: 'مولد كهربائي',
  solar: 'طاقة شمسية',
  kerosene: 'كيروسين / تقليدي',
  natural: 'طبيعية',
  artificial: 'صناعية',
  // Social & Income
  fixed: 'دخل ثابت / راتب شهري',
  fixed_salary: 'راتب ثابت',
  variable: 'دخل متغير / أعمال حرة',
  daily: 'عمالة يومية / غير منتظمة',
  seasonal: 'عمالة موسمية',
  pension: 'معاش تقاعدي / تأميني',
  social_aid: 'مساعدة اجتماعية / تكافل وكرامة',
  charity: 'مساعدات خيرية',
  none: 'لا يوجد / غير مستفيد',
  other: 'أخرى',
  low: 'منخفضة / محدودة الدخل',
  medium: 'متوسطة',
  high: 'ميسورة / مرتفعة',
  // Gender & General
  male: 'ذكر',
  female: 'أنثى',
  yes: 'نعم',
  no: 'لا',
  true: 'متوفر',
  false: 'غير متوفر',
  active: 'نشط',
  waiting: 'في الانتظار',
  completed: 'مكتمل',
  paid: 'مدفوع',
  deferred: 'آجل',
  free: 'مجاني / معفى',
  exempt: 'معفى'
};

/**
 * تعريب القيم الداخلية (مثل public وsanitary وgood وpoor وtrench وfixed) مع fallback عربي واضح للقيم غير المعروفة
 */
export function translatePrintValue(value: any, fallback = 'غير محدد'): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
  const raw = String(value).trim();
  if (!raw || raw === '---' || raw === 'null' || raw === 'undefined') return fallback;

  const lower = raw.toLowerCase();
  if (INTERNAL_PRINT_VALUE_MAP[lower]) {
    return INTERNAL_PRINT_VALUE_MAP[lower];
  }

  // If the string contains compound tokens like "owned (concrete)" or comma-separated internal values
  const replaced = raw.replace(/\b([a-zA-Z_]+)\b/g, (match) => {
    const mapped = INTERNAL_PRINT_VALUE_MAP[match.toLowerCase()];
    return mapped || match;
  });

  // If after mapping the string is still purely Latin characters/underscores (an unknown internal code), return Arabic fallback
  if (/^[a-zA-Z_ -]+$/.test(replaced)) {
    return fallback;
  }

  return replaced;
}

/**
 * دالة طباعة محتوى HTML عبر نافذة/إطار منفصل ومخصص للطباعة
 */
export function printHtmlDocument(htmlBody: string, options: PrintHeaderOptions) {
  const currentDate = options.date || new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const fullHtml = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${options.title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 12mm 15mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Cairo', sans-serif;
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #111827;
      font-size: 12px;
      line-height: 1.5;
      direction: rtl;
    }
    .print-header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-right {
      text-align: right;
    }
    .header-right h1 {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      color: #0369a1;
    }
    .header-right p {
      margin: 2px 0 0 0;
      font-size: 11px;
      color: #475569;
    }
    .header-center {
      text-align: center;
    }
    .header-center .doc-title {
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
      background: #f1f5f9;
      padding: 4px 16px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      display: inline-block;
    }
    .header-center .doc-subtitle {
      font-size: 11px;
      color: #64748b;
      margin-top: 3px;
      font-weight: 600;
    }
    .header-left {
      text-align: left;
      font-size: 10px;
      color: #475569;
    }
    .header-left .doc-code {
      font-family: monospace;
      font-weight: bold;
      font-size: 11px;
      color: #0f172a;
      background: #f8fafc;
      padding: 2px 8px;
      border: 1px dashed #94a3b8;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 14px;
      font-size: 11px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      text-align: right;
    }
    th {
      background-color: #f1f5f9;
      font-weight: 800;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      border-right: 4px solid #0284c7;
      padding-right: 8px;
      margin: 14px 0 8px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 8px;
    }
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 10px;
    }
    .info-label {
      font-size: 9px;
      color: #64748b;
      font-weight: 700;
      display: block;
    }
    .info-value {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
    }
    .signatures-block {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .sig-item {
      text-align: center;
      width: 30%;
    }
    .sig-title {
      font-size: 11px;
      font-weight: bold;
      color: #334155;
      margin-bottom: 25px;
    }
    .sig-line {
      border-bottom: 1px solid #94a3b8;
      width: 80%;
      margin: 0 auto;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
    }
    .badge-blue { background: #e0f2fe; color: #0369a1; }
    .badge-green { background: #dcfce7; color: #15803d; }
    .badge-amber { background: #fef3c7; color: #b45309; }
    .badge-red { background: #fee2e2; color: #b91c1c; }
    .print-footer {
      margin-top: 16px;
      font-size: 9px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #f1f5f9;
      padding-top: 6px;
    }
  </style>
</head>
<body>
  <div class="print-header">
    <div class="header-right">
      <h1>مركز الهداية الطبي</h1>
      <p>وحدة طب الأسرة والرعاية الصحية الأولية</p>
      <p>بيان مطبوع من النظام للمراجعة الداخلية</p>
    </div>
    <div class="header-center">
      <div class="doc-title">${options.title}</div>
      ${options.subtitle ? `<div class="doc-subtitle">${options.subtitle}</div>` : ''}
    </div>
    <div class="header-left">
      ${options.documentCode ? `<div class="doc-code">${options.documentCode}</div>` : ''}
      <div>تاريخ الطباعة: ${currentDate}</div>
      <div>نظام إدارة السجلات الطبية الإلكتروني</div>
    </div>
  </div>

  <div class="print-content">
    ${htmlBody}
  </div>

  <div class="signatures-block">
    <div class="sig-item">
      <div class="sig-title">مسؤول السجلات الطبية</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-item">
      <div class="sig-title">طبيب الأسرة</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-item">
      <div class="sig-title">توقيع المراجع</div>
      <div class="sig-line"></div>
    </div>
  </div>

  <div class="print-footer">
    <span>مركز الهداية الطبي - سجل طب الأسرة</span>
    <span>نسخة مطبوعة للمراجعة الداخلية (غير موثقة بتوقيع إلكتروني رسمي)</span>
  </div>
</body>
</html>
`;

  // Use hidden iframe to trigger print without touching the current DOM
  let iframe = document.getElementById('app-print-frame') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'app-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
  }

  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(fullHtml);
    iframeDoc.close();

    // Wait for assets and font to load then trigger print
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn('Iframe print failed, falling back to window.print', err);
        window.print();
      }
    }, 400);
  } else {
    window.print();
  }
}

/**
 * دالة طباعة الملف العائلي الشامل (الملف العائلي كاملاً)
 */
export function printFamilyFileFull(
  familyFile: any,
  members: any[],
  patientDeaths: any[] = [],
  housingData: any = null,
  socialData: any = null
) {
  const maleCount = members.filter(
    (m) => m.patients?.gender === 'ذكر' || m.patients?.gender === 'male'
  ).length;
  const femaleCount = members.filter(
    (m) => m.patients?.gender === 'أنثى' || m.patients?.gender === 'female'
  ).length;

  const membersRows = members.length > 0 ? members.map((m, idx) => `
    <tr>
      <td style="text-align:center; font-weight:bold;">${idx + 1}</td>
      <td style="font-weight:bold;">${m.patients?.name || '---'}</td>
      <td><span class="badge ${m.is_head ? 'badge-blue' : 'badge-green'}">${translatePrintValue(m.relationship_to_head, m.is_head ? 'رب الأسرة' : 'فرد')}</span></td>
      <td>${translatePrintValue(m.patients?.gender, 'غير محدد')}</td>
      <td style="text-align:center;">${m.patients?.date_of_birth ? new Date().getFullYear() - new Date(m.patients.date_of_birth).getFullYear() : '---'} سنة</td>
      <td style="font-family:monospace; text-align:center;">${m.patients?.national_id || '---'}</td>
      <td style="font-family:monospace; text-align:center;">${m.patients?.phone || '---'}</td>
      <td style="text-align:center; font-weight:bold; color:#b91c1c;">${m.patients?.blood_type || '---'}</td>
      <td>${translatePrintValue(m.notes || m.patients?.address, '---')}</td>
    </tr>
  `).join('') : '<tr><td colspan="9" style="text-align:center; color:#64748b;">لا يوجد أفراد مسجلين بالملف</td></tr>';

  const deathsRows = patientDeaths.length > 0 ? patientDeaths.map((d, idx) => `
    <tr>
      <td style="text-align:center;">${idx + 1}</td>
      <td style="font-weight:bold;">${d.patient_name || '---'}</td>
      <td style="text-align:center;">${d.death_date ? new Date(d.death_date).toLocaleDateString('ar-EG') : '---'}</td>
      <td>${translatePrintValue(d.death_cause, 'غير مدون')}</td>
      <td>${translatePrintValue(d.place_of_death, 'غير محدد')}</td>
      <td>${translatePrintValue(d.notes, '---')}</td>
    </tr>
  `).join('') : '<tr><td colspan="6" style="text-align:center; color:#15803d; font-weight:bold;">لا توجد وفيات مسجلة بالأسرة (حفظهم الله)</td></tr>';

  const ownershipLabel = housingData
    ? `${translatePrintValue(housingData.ownership_type, 'غير محدد')}${housingData.building_type ? ` (${translatePrintValue(housingData.building_type, 'غير محدد')})` : ''}`
    : 'غير محدد';

  const html = `
    <!-- البيانات الأساسية للأسرة -->
    <div class="section-title">١. البيانات الأساسية للملف العائلي</div>
    <div class="grid-4">
      <div class="info-card">
        <span class="info-label">رقم الملف العائلي</span>
        <span class="info-value" style="color:#0369a1; font-family:monospace;">${familyFile.family_code || '---'}</span>
      </div>
      <div class="info-card">
        <span class="info-label">اسم رب العائلة</span>
        <span class="info-value">${familyFile.head_name || '---'}</span>
      </div>
      <div class="info-card">
        <span class="info-label">الرقم القومي لرب العائلة</span>
        <span class="info-value" style="font-family:monospace;">${familyFile.national_id || '---'}</span>
      </div>
      <div class="info-card">
        <span class="info-label">الهاتف الأساسي</span>
        <span class="info-value" style="font-family:monospace;">${familyFile.phone || '---'}</span>
      </div>
      <div class="info-card">
        <span class="info-label">المحافظة</span>
        <span class="info-value">${translatePrintValue(familyFile.governorate, 'غير محدد')}</span>
      </div>
      <div class="info-card">
        <span class="info-label">الإدارة الصحية</span>
        <span class="info-value">${translatePrintValue(familyFile.administration, 'غير محدد')}</span>
      </div>
      <div class="info-card">
        <span class="info-label">القرية / المدينة</span>
        <span class="info-value">${translatePrintValue(familyFile.village_city, 'غير محدد')}</span>
      </div>
      <div class="info-card">
        <span class="info-label">الوحدة الصحية التابع لها</span>
        <span class="info-value" style="color:#0284c7;">${translatePrintValue(familyFile.health_unit, 'غير محدد')}</span>
      </div>
      <div class="info-card">
        <span class="info-label">رقم المنزل (بالملف)</span>
        <span class="info-value" style="font-family:monospace; font-weight:bold;">${familyFile.house_number || '............'}</span>
      </div>
      <div class="info-card">
        <span class="info-label">رقم الأسرة (بالملف)</span>
        <span class="info-value" style="font-family:monospace; font-weight:bold;">${familyFile.family_number || '............'}</span>
      </div>
    </div>

    <div class="info-card" style="margin-top: 8px;">
      <span class="info-label">العنوان التفصيلي والعلامات المميزة</span>
      <span class="info-value">${translatePrintValue(familyFile.address, 'غير محدد')} ${familyFile.nearest_landmark ? `(أقرب علامة مميزة: ${translatePrintValue(familyFile.nearest_landmark, 'غير محدد')})` : ''}</span>
    </div>

    <!-- التركيب الديموغرافي -->
    <div class="section-title" style="margin-top:14px;">٢. إحصائيات التركيب الديموغرافي للأسرة</div>
    <div class="grid-4">
      <div class="info-card" style="text-align:center;">
        <span class="info-label">إجمالي عدد الأفراد</span>
        <span class="info-value" style="font-size:16px;">${members.length}</span>
      </div>
      <div class="info-card" style="text-align:center;">
        <span class="info-label">الذكور</span>
        <span class="info-value" style="font-size:16px; color:#0369a1;">${maleCount}</span>
      </div>
      <div class="info-card" style="text-align:center;">
        <span class="info-label">الإناث</span>
        <span class="info-value" style="font-size:16px; color:#be185d;">${femaleCount}</span>
      </div>
      <div class="info-card" style="text-align:center;">
        <span class="info-label">الوفيات المسجلة</span>
        <span class="info-value" style="font-size:16px; color:#b91c1c;">${patientDeaths.length}</span>
      </div>
    </div>

    <!-- جدول أفراد العائلة -->
    <div class="section-title" style="margin-top:14px;">٣. بيان تفصيلي بأفراد الأسرة المقيدين بالملف</div>
    <table>
      <thead>
        <tr>
          <th style="width:30px; text-align:center;">م</th>
          <th>اسم الفرد بالكامل</th>
          <th>صلة القرابة</th>
          <th>النوع</th>
          <th style="text-align:center;">العمر</th>
          <th style="text-align:center;">الرقم القومي</th>
          <th style="text-align:center;">رقم الهاتف</th>
          <th style="text-align:center;">الفصيلة</th>
          <th>ملاحظات</th>
        </tr>
      </thead>
      <tbody>
        ${membersRows}
      </tbody>
    </table>

    <!-- بيان البيئة السكنية والمسكن -->
    <div class="section-title">٤. بيان حالة المسكن والبيئة السكنية</div>
    ${housingData ? `
      <div class="grid-3">
        <div class="info-card"><span class="info-label">نوع السكن والملكية</span><span class="info-value">${ownershipLabel}</span></div>
        <div class="info-card"><span class="info-label">عدد الغرف والأفراد</span><span class="info-value">${housingData.rooms_count || 'غير محدد'} غرف / ${members.length} أفراد</span></div>
        <div class="info-card"><span class="info-label">مصدر مياه الشرب</span><span class="info-value">${translatePrintValue(housingData.water_source, 'شبكة عامة')}</span></div>
        <div class="info-card"><span class="info-label">الصرف الصحي</span><span class="info-value">${translatePrintValue(housingData.sanitation_type, 'شبكة عامة')}</span></div>
        <div class="info-card"><span class="info-label">الكهرباء والإنارة</span><span class="info-value">${housingData.lighting_source ? translatePrintValue(housingData.lighting_source, 'متوفرة') : (housingData.electricity_available !== false ? 'متوفرة وآمنة' : 'غير متوفرة')}</span></div>
        <div class="info-card"><span class="info-label">التهوية والنظافة العامة</span><span class="info-value">${translatePrintValue(housingData.ventilation_condition || housingData.ventilation, 'جيدة')}</span></div>
      </div>
    ` : `
      <p style="font-size:11px; color:#64748b; margin:4px 0;">لا توجد بيانات بيئة سكنية مفصلة مسجلة لهذا الملف.</p>
    `}

    <!-- بيان البحث الاجتماعي -->
    <div class="section-title">٥. بيان البحث الاجتماعي والتمكين</div>
    ${socialData ? `
      <div class="grid-3">
        <div class="info-card"><span class="info-label">الحالة الاقتصادية التقديرية</span><span class="info-value">${translatePrintValue(socialData.economic_status || socialData.income_level, 'متوسطة')}</span></div>
        <div class="info-card"><span class="info-label">مصدر الدخل الأساسي</span><span class="info-value">${translatePrintValue(socialData.income_source || socialData.income_type, 'غير محدد')}</span></div>
        <div class="info-card"><span class="info-label">الدعم التكافلي والضماني</span><span class="info-value">${translatePrintValue(socialData.social_aid || socialData.support_type, 'غير مستفيد')}</span></div>
      </div>
    ` : `
      <p style="font-size:11px; color:#64748b; margin:4px 0;">لا توجد بيانات بحث اجتماعي مسجلة لهذا الملف.</p>
    `}

    <!-- بيان الوفيات بالأسرة -->
    <div class="section-title">٦. بيان وفيات الأسرة المسجلة</div>
    <table>
      <thead>
        <tr>
          <th style="width:30px; text-align:center;">م</th>
          <th>اسم المتوفى</th>
          <th style="text-align:center;">تاريخ الوفاة</th>
          <th>سبب الوفاة المدون</th>
          <th>مكان الوفاة</th>
          <th>ملاحظات</th>
        </tr>
      </thead>
      <tbody>
        ${deathsRows}
      </tbody>
    </table>
  `;

  printHtmlDocument(html, {
    title: `ملف صحة الأسرة رقم: ${familyFile.family_code || ''}`,
    subtitle: `رب العائلة: ${familyFile.head_name || ''}`,
    documentCode: `FF-${familyFile.family_code || '001'}`
  });
}

/**
 * دالة طباعة فاتورة مريض أو إيصال سداد
 */
export function printInvoiceDocument(invoice: any, patient?: any) {
  const patientName = invoice.patientName || patient?.name || 'مريض غير محدد';
  const invNumber = invoice.id || invoice.invoice_number || 'INV-001';
  const invDate = invoice.date ? new Date(invoice.date).toLocaleDateString('ar-EG') : new Date().toLocaleDateString('ar-EG');
  const amount = invoice.amount || 0;
  const statusLabel = invoice.status === 'PAID' ? 'تم السداد (مدفوع بالكامل)' : invoice.status === 'DEFERRED' ? 'آجل (قيد الانتظار)' : 'معفى / مجاني';
  const statusBadge = invoice.status === 'PAID' ? 'badge-green' : invoice.status === 'DEFERRED' ? 'badge-amber' : 'badge-blue';

  const html = `
    <div style="max-width: 600px; margin: 0 auto;">
      <div class="section-title">بيانات إيصال السداد / الفاتورة</div>
      
      <div class="grid-2" style="margin-bottom: 12px;">
        <div class="info-card">
          <span class="info-label">رقم الفاتورة</span>
          <span class="info-value" style="font-family:monospace; color:#0369a1;">#${invNumber}</span>
        </div>
        <div class="info-card">
          <span class="info-label">تاريخ الإصدار</span>
          <span class="info-value">${invDate}</span>
        </div>
        <div class="info-card">
          <span class="info-label">اسم المريض</span>
          <span class="info-value">${patientName}</span>
        </div>
        <div class="info-card">
          <span class="info-label">العيادة / الغرفة</span>
          <span class="info-value">${translatePrintValue(invoice.room, 'العيادة العامة')}</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:40px; text-align:center;">م</th>
            <th>البيان / الخدمة الطبية</th>
            <th style="width:100px; text-align:center;">الكمية</th>
            <th style="width:120px; text-align:left;">المبلغ (ج.م)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align:center;">١</td>
            <td style="font-weight:bold;">خدمات الفحص والمتابعة الطبية (${translatePrintValue(invoice.room, 'العيادة العامة')})</td>
            <td style="text-align:center;">١</td>
            <td style="text-align:left; font-weight:bold; font-family:monospace;">${amount.toLocaleString()} ج.م</td>
          </tr>
          <tr>
            <td colspan="3" style="text-align:right; font-weight:bold; background:#f1f5f9;">الإجمالي الكلي المطلوب سداده:</td>
            <td style="text-align:left; font-weight:900; font-size:14px; color:#0369a1; background:#f1f5f9; font-family:monospace;">${amount.toLocaleString()} ج.م</td>
          </tr>
        </tbody>
      </table>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding:10px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;">
        <span style="font-weight:bold; font-size:12px;">حالة الفاتورة:</span>
        <span class="badge ${statusBadge}" style="font-size:12px; padding:4px 12px;">${statusLabel}</span>
      </div>

      <div style="margin-top:15px; font-size:10px; color:#64748b; text-align:center;">
        شكراً لاختياركم مركز الهداية الطبي. نرجو الاحتفاظ بالإيصال لمراجعة الحسابات والزيارات القادمة.
      </div>
    </div>
  `;

  printHtmlDocument(html, {
    title: 'إيصال سداد وفاتورة علاجية',
    subtitle: `مريض: ${patientName}`,
    documentCode: `INV-${invNumber}`
  });
}

/**
 * دالة طباعة نموذج الزيارات والتردد (Visits Form)
 */
export function printVisitsFormDocument(patient: any, visits: any[], familyFile?: any) {
  const rows = visits.length > 0 ? visits.map((v, i) => `
    <tr>
      <td style="text-align:center;">${i + 1}</td>
      <td style="text-align:center; font-family:monospace;">${v.visit_date || '---'}</td>
      <td>${translatePrintValue(v.clinic_name, 'طب الأسرة')}</td>
      <td>${translatePrintValue(v.chief_complaint, '---')}</td>
      <td>${translatePrintValue(v.diagnosis, '---')}</td>
      <td>${translatePrintValue(v.treatment, '---')}</td>
      <td>${translatePrintValue(v.doctor_name, 'طبيب الوحدة')}</td>
    </tr>
  `).join('') : '<tr><td colspan="7" style="text-align:center; color:#64748b;">لا توجد زيارات مسجلة للمريض</td></tr>';

  const html = `
    <!-- شريط الترقيم من 4 مستويات -->
    <div style="border: 2px solid #0f172a; border-radius: 8px; padding: 8px 12px; margin-bottom: 14px; background-color: #ffffff;">
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); text-align: center; font-size: 11px; font-weight: bold; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 6px; gap: 8px;">
        <div style="border-left: 1px solid #cbd5e1; padding-left: 4px;">
          <span style="color: #64748b; font-size: 10px; display: block;">رقم الملف العائلي</span>
          <span style="font-family: monospace; font-size: 13px; color: #0f172a;">${familyFile?.family_code || familyFile?.id || '............'}</span>
        </div>
        <div style="border-left: 1px solid #cbd5e1; padding-left: 4px;">
          <span style="color: #64748b; font-size: 10px; display: block;">رقم المنزل</span>
          <span style="font-family: monospace; font-size: 13px; color: #0f172a;">${familyFile?.house_number || '............'}</span>
        </div>
        <div style="border-left: 1px solid #cbd5e1; padding-left: 4px;">
          <span style="color: #64748b; font-size: 10px; display: block;">رقم الأسرة</span>
          <span style="font-family: monospace; font-size: 13px; color: #0f172a;">${familyFile?.family_number || '............'}</span>
        </div>
        <div>
          <span style="color: #64748b; font-size: 10px; display: block;">رقم الفرد</span>
          <span style="font-family: monospace; font-size: 13px; color: #0f172a;">${patient?.family_individual_number ?? (patient?.individual_number || '............')}</span>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 2fr 2fr 1.5fr 1fr; font-size: 11px; font-weight: bold; gap: 8px;">
        <div><span style="color: #64748b;">اسم المريض: </span>${patient?.name || '............'}</div>
        <div><span style="color: #64748b;">الرقم القومي: </span><span style="font-family: monospace;">${patient?.national_id || '............'}</span></div>
        <div><span style="color: #64748b;">تاريخ الميلاد: </span><span style="font-family: monospace;">${patient?.date_of_birth || '............'}</span></div>
        <div><span style="color: #64748b;">النوع: </span>${translatePrintValue(patient?.gender, 'غير محدد')}</div>
      </div>
    </div>

    <div class="section-title">سجل التردد والزيارات الطبية</div>
    <table>
      <thead>
        <tr>
          <th style="width:30px; text-align:center;">م</th>
          <th style="width:90px; text-align:center;">التاريخ</th>
          <th>العيادة / التخصص</th>
          <th>الشكوى والأعراض</th>
          <th>التشخيص المبدئي / النهائي</th>
          <th>العلاج والإجراء الطبي</th>
          <th>اسم الطبيب</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;

  printHtmlDocument(html, {
    title: 'نموذج التردد والزيارات الطبية (Visits Form)',
    subtitle: `المريض: ${patient.name}`,
    documentCode: `VF-${patient.id?.slice(0, 6) || '001'}`
  });
}
