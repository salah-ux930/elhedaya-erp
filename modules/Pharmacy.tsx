import React, { useState, useEffect, useMemo } from 'react';
import { DB } from '../store.ts';
import {
  Patient,
  PharmacyItem,
  PharmacyBatch,
  PharmacyBatchStatus,
  PharmacyDispenseOrder,
  PharmacyDispenseSource,
  BatchAllocationSlice
} from '../types.ts';
import {
  Pill,
  PackagePlus,
  Layers,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  Trash2,
  Printer,
  FileText,
  Clock,
  ArrowLeft,
  RefreshCw,
  Copy,
  Check,
  Edit3,
  Ban,
  Stethoscope,
  Activity,
  UserCheck,
  Boxes,
  Calendar,
  X,
  FolderOpen
} from 'lucide-react';
import { HospitalOperationalEngine } from '../services/hospitalOperationalEngine.ts';
import PatientClinical360Modal from '../components/PatientClinical360Modal.tsx';

const MIGRATION_SQL = `-- Migration: 20261024_pharmacy_batches_fefo_fifo.sql
-- Security Compliance: Rule 2, Rule 3 & Rule 7 (RLS enabled, TO authenticated ONLY, NO TO anon)

CREATE TABLE IF NOT EXISTS public.pharmacy_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE,
    trade_name TEXT NOT NULL,
    generic_name TEXT,
    dosage_form TEXT NOT NULL DEFAULT 'أقراص',
    strength TEXT,
    unit TEXT NOT NULL DEFAULT 'علبة',
    min_stock_level NUMERIC NOT NULL DEFAULT 10,
    storage_conditions TEXT DEFAULT 'درجة حرارة الغرفة (أقل من 25°C)',
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pharmacy_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.pharmacy_items(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    production_date DATE,
    expiry_date DATE NOT NULL,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    initial_quantity NUMERIC NOT NULL CHECK (initial_quantity > 0),
    remaining_quantity NUMERIC NOT NULL CHECK (remaining_quantity >= 0),
    supplier_name TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DEPLETED', 'EXPIRED', 'QUARANTINED')),
    notes TEXT,
    received_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pharmacy_dispense_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL DEFAULT 'DIRECT' CHECK (source_type IN ('CLINIC_PRESCRIPTION', 'DIALYSIS_SESSION', 'DIRECT')),
    appointment_id UUID REFERENCES public.clinic_appointments(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.dialysis_sessions(id) ON DELETE SET NULL,
    prescribing_doctor TEXT,
    dispensed_by TEXT NOT NULL,
    dispensed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    diagnosis_or_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pharmacy_dispense_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispense_order_id UUID NOT NULL REFERENCES public.pharmacy_dispense_orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.pharmacy_items(id) ON DELETE RESTRICT,
    batch_id UUID NOT NULL REFERENCES public.pharmacy_batches(id) ON DELETE RESTRICT,
    batch_number_snapshot TEXT NOT NULL,
    expiry_date_snapshot DATE NOT NULL,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    dosage_instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pharmacy_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_dispense_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_dispense_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_only_pharmacy_items" ON public.pharmacy_items;
DROP POLICY IF EXISTS "anon_access_pharmacy_items" ON public.pharmacy_items;
DROP POLICY IF EXISTS "authenticated_only_pharmacy_batches" ON public.pharmacy_batches;
DROP POLICY IF EXISTS "anon_access_pharmacy_batches" ON public.pharmacy_batches;
DROP POLICY IF EXISTS "authenticated_only_pharmacy_dispense_orders" ON public.pharmacy_dispense_orders;
DROP POLICY IF EXISTS "anon_access_pharmacy_dispense_orders" ON public.pharmacy_dispense_orders;
DROP POLICY IF EXISTS "authenticated_only_pharmacy_dispense_items" ON public.pharmacy_dispense_items;
DROP POLICY IF EXISTS "anon_access_pharmacy_dispense_items" ON public.pharmacy_dispense_items;

CREATE POLICY "authenticated_only_pharmacy_items" ON public.pharmacy_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_only_pharmacy_batches" ON public.pharmacy_batches FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_only_pharmacy_dispense_orders" ON public.pharmacy_dispense_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_only_pharmacy_dispense_items" ON public.pharmacy_dispense_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';`;

interface DraftDispenseLine {
  id: string;
  item_id: string;
  requested_quantity: number;
  dosage_instructions: string;
}

const DOSAGE_FORMS = [
  'أقراص',
  'كبسولات',
  'أمبول للحقن',
  'فيال وريدي',
  'سرنجة مسبقة التعبئة (Erythropoietin/Heparin)',
  'محلول وريدي',
  'شراب / معلق',
  'مرهم / كريم',
  'مستلزم دوائي للغسيل'
];

const DISPENSE_UNITS = [
  'علبة',
  'شريط',
  'قرص',
  'أمبول',
  'فيال',
  'سرنجة',
  'زجاجة',
  'عبوة'
];

const PharmacyModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dispense' | 'queues' | 'catalog' | 'traceability'>('dispense');
  const [loading, setLoading] = useState<boolean>(true);
  const [schemaMissing, setSchemaMissing] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Core Data
  const [items, setItems] = useState<PharmacyItem[]>([]);
  const [batches, setBatches] = useState<PharmacyBatch[]>([]);
  const [dispenseOrders, setDispenseOrders] = useState<PharmacyDispenseOrder[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [clinicQueue, setClinicQueue] = useState<any[]>([]);
  const [dialysisQueue, setDialysisQueue] = useState<any[]>([]);
  const [familyFiles, setFamilyFiles] = useState<any[]>([]);
  const [patientProblems, setPatientProblems] = useState<any[]>([]);
  const [physicalExams, setPhysicalExams] = useState<any[]>([]);
  const [patientFor360, setPatientFor360] = useState<Patient | null>(null);

  // Current User
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('dialysis_user') || '{}');
    } catch {
      return { name: 'صيدلي المركز' };
    }
  }, []);

  // --- Tab 1: Smart Dispensing State ---
  const [dispenseSource, setDispenseSource] = useState<PharmacyDispenseSource>('DIRECT');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientSearchQuery, setPatientSearchQuery] = useState<string>('');
  const [linkedAppointmentId, setLinkedAppointmentId] = useState<string>('');
  const [linkedSessionId, setLinkedSessionId] = useState<string>('');
  const [prescribingDoctor, setPrescribingDoctor] = useState<string>('');
  const [diagnosisOrNotes, setDiagnosisOrNotes] = useState<string>('');
  const [draftLines, setDraftLines] = useState<DraftDispenseLine[]>([]);
  const [selectedItemIdToAdd, setSelectedItemIdToAdd] = useState<string>('');
  const [quantityToAdd, setQuantityToAdd] = useState<number>(1);
  const [instructionsToAdd, setInstructionsToAdd] = useState<string>('');
  const [submittingDispense, setSubmittingDispense] = useState<boolean>(false);
  const [printableOrder, setPrintableOrder] = useState<PharmacyDispenseOrder | null>(null);

  // --- Tab 3: Catalog & Batches State ---
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<PharmacyItem | null>(null);
  const [showItemModal, setShowItemModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<Partial<PharmacyItem> | null>(null);
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [newBatchForm, setNewBatchForm] = useState<{
    item_id: string;
    batch_number: string;
    production_date: string;
    expiry_date: string;
    received_date: string;
    initial_quantity: number;
    supplier_name: string;
    notes: string;
  }>({
    item_id: '',
    batch_number: '',
    production_date: '',
    expiry_date: '',
    received_date: new Date().toISOString().split('T')[0],
    initial_quantity: 10,
    supplier_name: '',
    notes: ''
  });

  // --- Tab 4: Traceability & Expiry Radar State ---
  const [traceSubView, setTraceSubView] = useState<'orders' | 'expiry_radar'>('orders');
  const [traceSearch, setTraceSearch] = useState<string>('');
  const [expiryFilter, setExpiryFilter] = useState<'ALL_ALERTS' | 'EXPIRING_SOON' | 'EXPIRED' | 'QUARANTINED'>('ALL_ALERTS');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const showNotice = (msg: string, isError = false) => {
    if (isError) {
      setErrorBanner(msg);
      setSuccessBanner(null);
    } else {
      setSuccessBanner(msg);
      setErrorBanner(null);
      setTimeout(() => setSuccessBanner(null), 5000);
    }
  };

  const loadAllPharmacyData = async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const [loadedItems, loadedBatches, loadedOrders, loadedPatients, queues, ff, probs, pExams] = await Promise.all([
        DB.getPharmacyItems(),
        DB.getPharmacyBatches(),
        DB.getPharmacyDispenseOrders(),
        DB.getPatients(),
        DB.getPendingPharmacyQueues(),
        DB.getFamilyFiles(),
        DB.getPatientProblems(),
        DB.getPhysicalExams()
      ]);

      setSchemaMissing(false);
      setItems(loadedItems || []);
      setBatches(loadedBatches || []);
      setDispenseOrders(loadedOrders || []);
      setPatients(loadedPatients || []);
      setClinicQueue(queues.clinicPrescriptions || []);
      setDialysisQueue(queues.dialysisSessions || []);
      setFamilyFiles(ff || []);
      setPatientProblems(probs || []);
      setPhysicalExams(pExams || []);

      if (selectedCatalogItem) {
        const refreshed = (loadedItems || []).find(i => i.id === selectedCatalogItem.id);
        setSelectedCatalogItem(refreshed || null);
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('MISSING_PHARMACY_SCHEMA') || msg.includes('MISSING_TABLE')) {
        setSchemaMissing(true);
      } else {
        setErrorBanner(msg || 'حدث خطأ أثناء تحميل بيانات الصيدلية');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllPharmacyData();
  }, []);

  // --- Helper: Days until expiry ---
  const getDaysUntilExpiry = (expiryDateStr: string): number => {
    const exp = new Date(expiryDateStr + 'T00:00:00');
    const now = new Date(todayStr + 'T00:00:00');
    const diffMs = exp.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  // --- Computed Summary per Medication Item ---
  const itemMetricsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        validStock: number;
        expiredStock: number;
        activeBatchesCount: number;
        nearExpiryBatchesCount: number;
        nextBatch: PharmacyBatch | null;
        orderedBatches: PharmacyBatch[];
      }
    >();

    items.forEach(item => {
      const itemBatches = batches
        .filter(b => b.item_id === item.id)
        .sort((a, b) => {
          if (a.expiry_date !== b.expiry_date) return a.expiry_date.localeCompare(b.expiry_date);
          if (a.received_date !== b.received_date) return a.received_date.localeCompare(b.received_date);
          return (a.created_at || '').localeCompare(b.created_at || '');
        });

      const validEligible = itemBatches.filter(
        b => b.status === 'ACTIVE' && Number(b.remaining_quantity) > 0 && b.expiry_date >= todayStr
      );

      const validStock = validEligible.reduce((s, b) => s + Number(b.remaining_quantity), 0);
      const expiredStock = itemBatches
        .filter(b => Number(b.remaining_quantity) > 0 && (b.expiry_date < todayStr || b.status === 'EXPIRED'))
        .reduce((s, b) => s + Number(b.remaining_quantity), 0);

      const nearExpiryBatchesCount = validEligible.filter(b => {
        const days = getDaysUntilExpiry(b.expiry_date);
        return days >= 0 && days <= 90;
      }).length;

      map.set(item.id, {
        validStock,
        expiredStock,
        activeBatchesCount: validEligible.length,
        nearExpiryBatchesCount,
        nextBatch: validEligible[0] || null,
        orderedBatches: itemBatches
      });
    });

    return map;
  }, [items, batches, todayStr]);

  // --- Global KPIs ---
  const kpiStats = useMemo(() => {
    let totalValidUnits = 0;
    let lowStockItemsCount = 0;
    let nearExpiryBatchesCount = 0;
    let expiredActiveBatchesCount = 0;

    items.forEach(item => {
      const m = itemMetricsMap.get(item.id);
      if (!m) return;
      totalValidUnits += m.validStock;
      if (m.validStock <= Number(item.min_stock_level)) lowStockItemsCount++;
      nearExpiryBatchesCount += m.nearExpiryBatchesCount;
    });

    batches.forEach(b => {
      if (Number(b.remaining_quantity) > 0 && (b.expiry_date < todayStr || b.status === 'EXPIRED')) {
        expiredActiveBatchesCount++;
      }
    });

    const pendingClinicCount = clinicQueue.filter(q => !q.dispensedOrder).length;
    const pendingDialysisCount = dialysisQueue.filter(s => s.medications?.length > 0 && !s.dispensedOrder).length;

    return {
      totalItems: items.length,
      totalValidUnits,
      lowStockItemsCount,
      nearExpiryBatchesCount,
      expiredActiveBatchesCount,
      pendingQueueTotal: pendingClinicCount + pendingDialysisCount
    };
  }, [items, batches, itemMetricsMap, clinicQueue, dialysisQueue, todayStr]);

  // --- Live FEFO + FIFO Allocation Preview for Draft Dispense Lines ---
  const draftAllocationsPreview = useMemo(() => {
    // Clone batches in memory so if the same item is added or to compute accurately
    const simulatedBatches: PharmacyBatch[] = batches.map(b => ({ ...b }));
    return draftLines.map(line => {
      const item = items.find(i => i.id === line.item_id);
      const result = DB.allocateBatchesFEFO_FIFO(line.item_id, line.requested_quantity, simulatedBatches);
      // Deduct from simulatedBatches for subsequent lines of the same drug
      result.allocations.forEach(slice => {
        const target = simulatedBatches.find(b => b.id === slice.batch_id);
        if (target) {
          target.remaining_quantity = Math.max(0, Number(target.remaining_quantity) - slice.allocated_quantity);
        }
      });
      return {
        line,
        item,
        result
      };
    });
  }, [draftLines, items, batches]);

  // --- Handlers: Dispensing Workstation ---
  const handleAddDraftLine = () => {
    if (!selectedItemIdToAdd) {
      showNotice('يرجى اختيار الصنف الدوائي أولاً', true);
      return;
    }
    if (quantityToAdd <= 0) {
      showNotice('يجب أن تكون الكمية المطلوبة أكبر من صفر', true);
      return;
    }

    const existingIndex = draftLines.findIndex(l => l.item_id === selectedItemIdToAdd);
    if (existingIndex >= 0) {
      const updated = [...draftLines];
      updated[existingIndex].requested_quantity += Number(quantityToAdd);
      if (instructionsToAdd.trim()) {
        updated[existingIndex].dosage_instructions = instructionsToAdd.trim();
      }
      setDraftLines(updated);
    } else {
      setDraftLines(prev => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          item_id: selectedItemIdToAdd,
          requested_quantity: Number(quantityToAdd),
          dosage_instructions: instructionsToAdd.trim()
        }
      ]);
    }

    setSelectedItemIdToAdd('');
    setQuantityToAdd(1);
    setInstructionsToAdd('');
    setErrorBanner(null);
  };

  const handleRemoveDraftLine = (lineId: string) => {
    setDraftLines(prev => prev.filter(l => l.id !== lineId));
  };

  const handleUpdateDraftQuantity = (lineId: string, newQty: number) => {
    if (newQty <= 0) return;
    setDraftLines(prev =>
      prev.map(l => (l.id === lineId ? { ...l, requested_quantity: newQty } : l))
    );
  };

  const handleConfirmDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      showNotice('يرجى اختيار المريض المستفيد قبل اعتماد الصرف', true);
      return;
    }
    if (draftLines.length === 0) {
      showNotice('يرجى إضافة صنف دوائي واحد على الأقل إلى إذن الصرف', true);
      return;
    }

    const anyShortage = draftAllocationsPreview.find(p => !p.result.isFullyCovered);
    if (anyShortage) {
      showNotice(
        `لا يمكن إتمام الصرف: الرصيد الصالح غير كافٍ للصنف (${anyShortage.item?.trade_name}). المتاح: ${anyShortage.result.totalValidAvailable}، المطلوب: ${anyShortage.line.requested_quantity}`,
        true
      );
      return;
    }

    setSubmittingDispense(true);
    setErrorBanner(null);
    try {
      const createdOrder = await DB.createPharmacyDispenseOrder(
        {
          patient_id: selectedPatientId,
          source_type: dispenseSource,
          appointment_id: linkedAppointmentId || undefined,
          session_id: linkedSessionId || undefined,
          prescribing_doctor: prescribingDoctor,
          dispensed_by: currentUser?.name || 'صيدلي المركز',
          diagnosis_or_notes: diagnosisOrNotes
        },
        draftLines.map(l => ({
          item_id: l.item_id,
          requested_quantity: l.requested_quantity,
          dosage_instructions: l.dosage_instructions
        }))
      );

      // Reset form and show receipt
      setDraftLines([]);
      setLinkedAppointmentId('');
      setLinkedSessionId('');
      setDiagnosisOrNotes('');
      await loadAllPharmacyData();
      setPrintableOrder(createdOrder);
      showNotice(`تم اعتماد صرف الأدوية بنجاح بالباتشات المحددة (إذن رقم ${createdOrder.order_number})`);
    } catch (err: any) {
      showNotice(err?.message || 'فشل تنفيذ إذن الصرف الدوائي', true);
    } finally {
      setSubmittingDispense(false);
    }
  };

  // --- Load Queue Item into Dispensing Workstation ---
  const handleLoadFromClinicQueue = (apt: any) => {
    setDispenseSource('CLINIC_PRESCRIPTION');
    setSelectedPatientId(apt.patient_id);
    setLinkedAppointmentId(apt.id);
    setLinkedSessionId('');
    setPrescribingDoctor(apt.doctors?.name || '');
    setDiagnosisOrNotes(
      `روشتة عيادة (${apt.clinics?.name || 'العيادة'}): ${apt.prescription || ''} ${
        apt.diagnosis ? `| التشخيص: ${apt.diagnosis}` : ''
      }`
    );
    setActiveTab('dispense');
    showNotice(`تم تحميل بيانات روشتة المريض (${apt.patients?.name || ''}) في شاشة الصرف. اختر الأدوية لتخصيص الباتشات.`);
  };

  const handleLoadFromDialysisQueue = (sess: any) => {
    const patientObj = patients.find(p => p.id === sess.patient_id);
    const medsText = (sess.medications || [])
      .map((m: any) => `${m.drug_name} (${m.dose || ''} ${m.route || ''})`)
      .join(' + ');

    setDispenseSource('DIALYSIS_SESSION');
    setSelectedPatientId(sess.patient_id);
    setLinkedSessionId(sess.id);
    setLinkedAppointmentId('');
    setPrescribingDoctor(sess.medications?.[0]?.doctor_signature || 'طبيب وحدة الكلى');
    setDiagnosisOrNotes(
      `أدوية جلسة غسيل كلوي بتاريخ ${sess.date} (غرفة ${sess.room}): ${medsText || sess.notes || ''}`
    );

    // Automatically match any medication names with our pharmacy catalog
    const matchedDrafts: DraftDispenseLine[] = [];
    (sess.medications || []).forEach((m: any) => {
      const drugNameLower = (m.drug_name || '').toLowerCase();
      const matchedItem = items.find(
        i =>
          i.trade_name.toLowerCase().includes(drugNameLower) ||
          (i.generic_name && i.generic_name.toLowerCase().includes(drugNameLower))
      );
      if (matchedItem) {
        matchedDrafts.push({
          id: `${Date.now()}-${Math.random()}`,
          item_id: matchedItem.id,
          requested_quantity: 1,
          dosage_instructions: `${m.dose || ''} - ${m.route || ''} ${m.instructions || ''}`.trim()
        });
      }
    });

    if (matchedDrafts.length > 0) {
      setDraftLines(matchedDrafts);
    }

    setActiveTab('dispense');
    showNotice(`تم تحويل طلب أدوية جلسة الغسيل للمريض (${patientObj?.name || ''}) إلى شاشة الصرف الذكي.`);
  };

  // --- Handlers: Medication Catalog & Batches ---
  const handleSaveMedicationItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.trade_name?.trim()) {
      showNotice('يرجى إدخال الاسم التجاري للدواء', true);
      return;
    }
    try {
      const saved = await DB.savePharmacyItem({
        ...editingItem,
        created_by: currentUser?.name || 'صيدلي المركز'
      });
      setShowItemModal(false);
      setEditingItem(null);
      await loadAllPharmacyData();
      setSelectedCatalogItem(saved);
      showNotice('تم حفظ بيانات الصنف الدوائي بنجاح');
    } catch (err: any) {
      showNotice(err?.message || 'فشل حفظ الصنف الدوائي', true);
    }
  };

  const handleSaveNewBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchForm.item_id) {
      showNotice('يرجى اختيار الدواء المرتبط بالباتش', true);
      return;
    }
    if (!newBatchForm.batch_number.trim()) {
      showNotice('يرجى إدخال رقم التشغيلة / الباتش (Batch Number)', true);
      return;
    }
    if (!newBatchForm.expiry_date) {
      showNotice('يرجى إدخال تاريخ انتهاء الصلاحية بدقة', true);
      return;
    }

    try {
      await DB.addPharmacyBatch({
        ...newBatchForm,
        received_by: currentUser?.name || 'صيدلي المركز'
      });
      setShowBatchModal(false);
      await loadAllPharmacyData();
      showNotice(`تم توريد الباتش (${newBatchForm.batch_number}) وإدراجه في ترتيب الصرف التلقائي (FEFO/FIFO)`);
    } catch (err: any) {
      showNotice(err?.message || 'فشل تسجيل الباتش الجديد', true);
    }
  };

  const handleChangeBatchStatus = async (batch: PharmacyBatch, newStatus: PharmacyBatchStatus) => {
    try {
      await DB.updatePharmacyBatchStatus(
        batch.id,
        newStatus,
        `${batch.notes ? batch.notes + ' | ' : ''}تم تغيير الحالة إلى ${newStatus} بواسطة ${
          currentUser?.name || 'الصيدلي'
        } بتاريخ ${todayStr}`
      );
      await loadAllPharmacyData();
      showNotice(`تم تحديث حالة الباتش (${batch.batch_number}) إلى ${newStatus}`);
    } catch (err: any) {
      showNotice(err?.message || 'فشل تحديث حالة الباتش', true);
    }
  };

  // Filtered Lists
  const filteredPatients = useMemo(() => {
    if (!patientSearchQuery.trim()) return patients;
    const q = patientSearchQuery.toLowerCase();
    return patients.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        (p.national_id && p.national_id.includes(q)) ||
        (p.phone && p.phone.includes(q))
    );
  }, [patients, patientSearchQuery]);

  // ملف الأمان الدوائي والحساسية للمريض المختار من الملف العائلي
  const selectedPatientSafetyProfile = useMemo(() => {
    if (!selectedPatientId) return null;
    const pObj = patients.find(p => p.id === selectedPatientId);
    if (!pObj) return null;
    return HospitalOperationalEngine.buildPatientOperationalProfile(pObj, {
      familyFiles,
      problems: patientProblems.filter(pr => pr.patient_id === pObj.id),
      physicalExams: physicalExams.filter(ex => ex.patient_id === pObj.id)
    });
  }, [selectedPatientId, patients, familyFiles, patientProblems, physicalExams]);

  const filteredCatalogItems = useMemo(() => {
    if (!catalogSearch.trim()) return items;
    const q = catalogSearch.toLowerCase();
    return items.filter(
      i =>
        i.trade_name.toLowerCase().includes(q) ||
        (i.generic_name && i.generic_name.toLowerCase().includes(q)) ||
        (i.code && i.code.toLowerCase().includes(q))
    );
  }, [items, catalogSearch]);

  const filteredDispenseOrders = useMemo(() => {
    if (!traceSearch.trim()) return dispenseOrders;
    const q = traceSearch.toLowerCase();
    return dispenseOrders.filter(order => {
      const patientMatch = order.patients?.name?.toLowerCase().includes(q);
      const orderNumMatch = order.order_number?.toLowerCase().includes(q);
      const batchOrDrugMatch = (order.pharmacy_dispense_items || []).some(
        di =>
          di.batch_number_snapshot?.toLowerCase().includes(q) ||
          di.pharmacy_items?.trade_name?.toLowerCase().includes(q) ||
          di.pharmacy_items?.generic_name?.toLowerCase().includes(q)
      );
      return patientMatch || orderNumMatch || batchOrDrugMatch;
    });
  }, [dispenseOrders, traceSearch]);

  const expiryRadarBatches = useMemo(() => {
    return batches.filter(b => {
      const days = getDaysUntilExpiry(b.expiry_date);
      const isExpired = days < 0 || b.status === 'EXPIRED';
      const isSoon = days >= 0 && days <= 90 && b.remaining_quantity > 0;
      const isQuarantined = b.status === 'QUARANTINED';

      if (expiryFilter === 'EXPIRED') return isExpired && b.remaining_quantity > 0;
      if (expiryFilter === 'EXPIRING_SOON') return isSoon;
      if (expiryFilter === 'QUARANTINED') return isQuarantined;
      return (isExpired && b.remaining_quantity > 0) || isSoon || isQuarantined;
    });
  }, [batches, expiryFilter, todayStr]);

  // ============================================================================
  // RULE 1 & RULE 3 GUARD: Explicit Schema Diagnostic Panel if Migration not run
  // ============================================================================
  if (schemaMissing) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 py-6" dir="rtl">
        <div className="bg-white border border-amber-300 rounded-2xl p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 text-amber-800 rounded-xl shrink-0">
              <ShieldAlert size={32} />
            </div>
            <div className="space-y-2 flex-1">
              <h2 className="text-xl font-bold text-slate-900">
                تجهيز جداول قاعدة البيانات لقسم الصيدلية والباتشات (Migration Required)
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                التزاماً بالقواعد المعمارية والأمنية للمشروع (القاعدة 1 و 2 و 3)، تم إنشاء ملف الهجرة الرسمي{' '}
                <code className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                  supabase/migrations/20261024_pharmacy_batches_fefo_fifo.sql
                </code>{' '}
                بسياسات أمان <code className="font-mono text-emerald-700">TO authenticated</code> حصراً. يرجى نسخ كود SQL أدناه وتشغيله في{' '}
                <strong>Supabase SQL Editor</strong> لتفعيل الجداول الأربعة الحية.
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between bg-slate-900 text-slate-100 px-4 py-3 rounded-t-xl">
            <span className="text-xs font-mono">20261024_pharmacy_batches_fefo_fifo.sql</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(MIGRATION_SQL);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 2500);
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                {copiedSql ? <Check size={15} /> : <Copy size={15} />}
                {copiedSql ? 'تم نسخ الكود بنجاح' : 'نسخ SQL بالكامل'}
              </button>
              <button
                onClick={loadAllPharmacyData}
                className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw size={15} /> إعادة الفحص بعد التشغيل
              </button>
            </div>
          </div>
          <pre
            dir="ltr"
            className="bg-slate-950 text-emerald-300 p-4 rounded-b-xl text-xs font-mono overflow-x-auto max-h-96 leading-relaxed"
          >
            {MIGRATION_SQL}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Top Workspace Header & KPI Strip */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              قسم الصيدلية وإدارة التشغيلات الدوائية (FEFO / FIFO)
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              الصرف الآلي للباتش الأقرب انتهاء صلاحية أولاً ثم الأقدم توريداً · تتبع دوائي كامل للمرضى بدون قيود مالية
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setEditingItem({
                  trade_name: '',
                  generic_name: '',
                  dosage_form: 'أقراص',
                  strength: '',
                  unit: 'علبة',
                  min_stock_level: 10,
                  storage_conditions: 'درجة حرارة الغرفة (أقل من 25°C)',
                  is_active: true
                });
                setShowItemModal(true);
              }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Plus size={17} /> تعريف دواء جديد
            </button>
            <button
              onClick={() => {
                setNewBatchForm({
                  item_id: selectedCatalogItem?.id || items[0]?.id || '',
                  batch_number: '',
                  production_date: '',
                  expiry_date: '',
                  received_date: todayStr,
                  initial_quantity: 20,
                  supplier_name: '',
                  notes: ''
                });
                setShowBatchModal(true);
              }}
              className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-xs transition-colors whitespace-nowrap"
            >
              <PackagePlus size={17} /> توريد باتش (تشغيلة) جديد
            </button>
          </div>
        </div>

        {/* 5-Column Quantitative KPI Strip (Tabular Numerals) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-5">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="text-xs font-medium text-slate-500">إجمالي الأصناف المسجلة</div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
              {kpiStats.totalItems}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              إجمالي الوحدات الصالحة: <span className="font-mono tabular-nums font-bold">{kpiStats.totalValidUnits}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="text-xs font-medium text-slate-500">طابور الروشتات والغسيل</div>
            <div className="text-2xl font-bold text-primary-700 font-mono tabular-nums mt-1">
              {kpiStats.pendingQueueTotal}
            </div>
            <div className="text-xs text-slate-500 mt-1">بانتظار تخصيص الباتش والصرف</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="text-xs font-medium text-slate-500">أصناف بلغت حد الطلب</div>
            <div
              className={`text-2xl font-bold font-mono tabular-nums mt-1 ${
                kpiStats.lowStockItemsCount > 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {kpiStats.lowStockItemsCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">تحتاج لتوريد تشغيلات جديدة</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="text-xs font-medium text-slate-500">باتشات قريبة الانتهاء (&le; 90 يوم)</div>
            <div
              className={`text-2xl font-bold font-mono tabular-nums mt-1 ${
                kpiStats.nearExpiryBatchesCount > 0 ? 'text-amber-700' : 'text-slate-900'
              }`}
            >
              {kpiStats.nearExpiryBatchesCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">لها الأولوية القصوى في الصرف FEFO</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="text-xs font-medium text-slate-500">باتشات منتهية محجوبة آلياً</div>
            <div
              className={`text-2xl font-bold font-mono tabular-nums mt-1 ${
                kpiStats.expiredActiveBatchesCount > 0 ? 'text-red-700' : 'text-slate-900'
              }`}
            >
              {kpiStats.expiredActiveBatchesCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">مستبعدة تلقائياً من الصرف للمرضى</div>
          </div>
        </div>
      </div>

      {/* Feedback Banners */}
      {errorBanner && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-5 py-3.5 rounded-xl flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-red-600 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button onClick={() => setErrorBanner(null)} className="text-red-500 hover:text-red-700">
            <X size={18} />
          </button>
        </div>
      )}

      {successBanner && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-5 py-3.5 rounded-xl flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-600 hover:text-emerald-800">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Segmented Navigation Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-2 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveTab('dispense')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'dispense'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Pill size={17} /> 01. شاشة الصرف الذكي (FEFO / FIFO)
          </button>

          <button
            onClick={() => setActiveTab('queues')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'queues'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Stethoscope size={17} /> 02. طابور روشتات العيادات والغسيل ({kpiStats.pendingQueueTotal})
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'catalog'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers size={17} /> 03. دليل الأدوية وسجل الباتشات ({items.length})
          </button>

          <button
            onClick={() => setActiveTab('traceability')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'traceability'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText size={17} /> 04. التتبع الدوائي ورادار الصلاحيات
          </button>
        </div>

        <button
          onClick={loadAllPharmacyData}
          className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> تحديث البيانات
        </button>
      </div>

      {/* =====================================================================
          TAB 1: SMART FEFO / FIFO DISPENSING WORKSTATION
      ===================================================================== */}
      {activeTab === 'dispense' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Right Column (5 cols): Patient & Prescription Context + Add Drug Control */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">بيانات إذن الصرف والمريض</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                حدد مسار الصرف والمريض ثم أضف الأدوية لمعاينة الباتشات المرشحة تلقائياً
              </p>
            </div>

            {/* Source Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">مسار الصرف الطبي</label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDispenseSource('DIRECT')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                    dispenseSource === 'DIRECT'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  صرف مباشر للمريض
                </button>
                <button
                  type="button"
                  onClick={() => setDispenseSource('CLINIC_PRESCRIPTION')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                    dispenseSource === 'CLINIC_PRESCRIPTION'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  روشتة عيادة
                </button>
                <button
                  type="button"
                  onClick={() => setDispenseSource('DIALYSIS_SESSION')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                    dispenseSource === 'DIALYSIS_SESSION'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  جلسة غسيل كلوي
                </button>
              </div>
            </div>

            {/* Patient Selection with Fast Filter */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">المريض المستفيد *</label>
              <div className="relative">
                <Search size={15} className="absolute right-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={patientSearchQuery}
                  onChange={e => setPatientSearchQuery(e.target.value)}
                  placeholder="ابحث باسم المريض أو الرقم القومي..."
                  className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-primary-500 outline-none"
                />
              </div>
              <select
                value={selectedPatientId}
                onChange={e => setSelectedPatientId(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-primary-500 outline-none"
              >
                <option value="">-- اختر المريض من السجل ({filteredPatients.length}) --</option>
                {filteredPatients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.national_id || p.phone || 'بدون رقم قومي'}
                  </option>
                ))}
              </select>

              {/* رادار الأمان الدوائي والحساسية من الملف العائلي */}
              {selectedPatientSafetyProfile && (
                <div
                  className={`p-3.5 rounded-xl border space-y-2 mt-2 ${
                    selectedPatientSafetyProfile.hasAllergyAlert
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-black">
                      <ShieldAlert
                        size={15}
                        className={selectedPatientSafetyProfile.hasAllergyAlert ? 'text-rose-600' : 'text-emerald-600'}
                      />
                      <span>
                        {selectedPatientSafetyProfile.hasAllergyAlert
                          ? 'تحذير حساسية دوائية مسجل بالملف العائلي!'
                          : 'ملف الأمان الدوائي للمريض (لا توجد حساسية مسجلة)'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPatientFor360(selectedPatientSafetyProfile.patient)}
                      className="px-2.5 py-1 bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Activity size={12} className="text-primary-600" /> بطاقة المريض
                    </button>
                  </div>

                  {selectedPatientSafetyProfile.hasAllergyAlert && (
                    <div className="text-xs font-bold text-rose-800 bg-white/80 p-2 rounded-lg border border-rose-200">
                      الحساسية / التفاعلات الدوائية:{' '}
                      {[...selectedPatientSafetyProfile.drugReactions, ...selectedPatientSafetyProfile.allergies].join(' ، ')}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {selectedPatientSafetyProfile.familyFile && (
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold font-mono">
                        ملف عائلي: {selectedPatientSafetyProfile.familyFile.file_code}
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                      {selectedPatientSafetyProfile.billingEligibility.badgeText}
                    </span>
                    {selectedPatientSafetyProfile.chronicProblems.map((pr, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold">
                        مزمن: {pr.diagnosis_description}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">الطبيب المعالج / الواصف</label>
                <input
                  type="text"
                  value={prescribingDoctor}
                  onChange={e => setPrescribingDoctor(e.target.value)}
                  placeholder="اسم الطبيب..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">القائم بالصرف</label>
                <input
                  type="text"
                  value={currentUser?.name || 'صيدلي المركز'}
                  readOnly
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">التشخيص / نص الروشتة / ملاحظات</label>
              <textarea
                rows={2}
                value={diagnosisOrNotes}
                onChange={e => setDiagnosisOrNotes(e.target.value)}
                placeholder="ملاحظات إكلينيكية أو تفاصيل الروشتة..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-primary-500 outline-none"
              />
            </div>

            {/* Add Medication to Dispense Order */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">إضافة صنف دوائي لإذن الصرف</h3>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">الدواء / المستحضر الصيدلاني</label>
                <select
                  value={selectedItemIdToAdd}
                  onChange={e => setSelectedItemIdToAdd(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-primary-500 outline-none"
                >
                  <option value="">-- اختر الدواء --</option>
                  {items.map(item => {
                    const m = itemMetricsMap.get(item.id);
                    const avail = m?.validStock || 0;
                    const nextB = m?.nextBatch;
                    return (
                      <option key={item.id} value={item.id} disabled={avail <= 0}>
                        {item.trade_name} {item.strength ? `(${item.strength})` : ''} — المتاح الصالح: {avail} {item.unit}
                        {nextB ? ` | يبدأ من باتش ${nextB.batch_number} (صلاحية ${nextB.expiry_date})` : ' (نفد الرصيد)'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">الكمية المطلوبة</label>
                  <input
                    type="number"
                    min={1}
                    value={quantityToAdd}
                    onChange={e => setQuantityToAdd(Math.max(1, Number(e.target.value)))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono tabular-nums font-bold focus:bg-white focus:border-primary-500 outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">إرشادات الجرعة والاستخدام</label>
                  <input
                    type="text"
                    value={instructionsToAdd}
                    onChange={e => setInstructionsToAdd(e.target.value)}
                    placeholder="مثال: قرص كل 12 ساعة بعد الأكل"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-primary-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddDraftLine}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Plus size={17} /> إدراج الصنف وحساب الباتشات تلقائياً (FEFO / FIFO)
              </button>
            </div>
          </div>

          {/* Left Column (7 cols): Live Batch Allocation Preview & Confirm */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  معاينة التخصيص التلقائي للباتشات (FEFO &rarr; FIFO)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  يقوم النظام تلقائياً باختيار الباتش الأقرب انتهاء صلاحية ثم الأقدم توريداً، مع تجزئة الكمية على أكثر من باتش عند الحاجة
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                عدد الأصناف: {draftLines.length}
              </span>
            </div>

            {draftAllocationsPreview.length === 0 ? (
              <div className="py-16 text-center space-y-3 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Boxes size={40} className="mx-auto text-slate-400" />
                <div className="text-sm font-bold text-slate-700">لم تتم إضافة أدوية لإذن الصرف بعد</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  اختر الدواء والكمية من القائمة الجانبية، أو قم بتحميل روشتة جاهزة من تبويب «طابور روشتات العيادات والغسيل» لمشاهدة توزيع الباتشات لحظياً.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {draftAllocationsPreview.map(({ line, item, result }) => (
                  <div
                    key={line.id}
                    className={`rounded-xl border p-4 space-y-3 ${
                      result.isFullyCovered
                        ? 'border-slate-200 bg-slate-50/60'
                        : 'border-red-300 bg-red-50/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-slate-900">
                            {item?.trade_name || 'صنف غير معروف'}
                          </span>
                          {item?.strength && (
                            <span className="text-xs text-slate-500 font-mono">{item.strength}</span>
                          )}
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs text-slate-600">{item?.dosage_form}</span>
                        </div>
                        {line.dosage_instructions && (
                          <p className="text-xs text-slate-600 mt-1">
                            الجرعة: {line.dosage_instructions}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <label className="text-xs text-slate-500">المطلوب:</label>
                        <input
                          type="number"
                          min={1}
                          value={line.requested_quantity}
                          onChange={e =>
                            handleUpdateDraftQuantity(line.id, Math.max(1, Number(e.target.value)))
                          }
                          className="w-20 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-sm font-mono tabular-nums font-bold text-center"
                        />
                        <span className="text-xs text-slate-600">{item?.unit}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftLine(line.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف الصنف"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Batch Allocation Table for this drug */}
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3 font-bold">أولوية الصرف</th>
                            <th className="py-2 px-3 font-bold">رقم الباتش (Batch #)</th>
                            <th className="py-2 px-3 font-bold">تاريخ الانتهاء (FEFO)</th>
                            <th className="py-2 px-3 font-bold">تاريخ التوريد (FIFO)</th>
                            <th className="py-2 px-3 font-bold">المتاح بالباتش</th>
                            <th className="py-2 px-3 font-bold">الكمية المخصصة للصرف</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {result.allocations.map(slice => {
                            const daysLeft = getDaysUntilExpiry(slice.expiry_date);
                            return (
                              <tr key={slice.batch_id} className="hover:bg-slate-50">
                                <td className="py-2 px-3 font-mono tabular-nums text-emerald-700 font-bold">
                                  الأولوية #{slice.priority_rank}
                                </td>
                                <td className="py-2 px-3 font-mono tabular-nums font-bold text-slate-900">
                                  {slice.batch_number}
                                </td>
                                <td className="py-2 px-3 font-mono tabular-nums">
                                  <span
                                    className={
                                      daysLeft <= 90 ? 'text-amber-700 font-bold' : 'text-slate-700'
                                    }
                                  >
                                    {slice.expiry_date}
                                  </span>{' '}
                                  <span className="text-slate-400">({daysLeft} يوم)</span>
                                </td>
                                <td className="py-2 px-3 font-mono tabular-nums text-slate-600">
                                  {slice.received_date}
                                </td>
                                <td className="py-2 px-3 font-mono tabular-nums text-slate-600">
                                  {slice.available_in_batch} {item?.unit}
                                </td>
                                <td className="py-2 px-3 font-mono tabular-nums font-bold text-primary-700">
                                  {slice.allocated_quantity} {item?.unit}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Multi-batch split or shortage notices */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="text-slate-600">
                        {result.allocations.length > 1 && (
                          <span className="text-amber-800 font-medium">
                            تم تقسيم الكمية تلقائياً على ({result.allocations.length}) باتشات متتالية لاستكمال المطلوب وفق قاعدة FEFO/FIFO.
                          </span>
                        )}
                        {result.excludedExpiredCount > 0 && (
                          <span className="text-slate-500 mr-2">
                            (تم استبعاد {result.excludedExpiredCount} باتش منتهي الصلاحية آلياً)
                          </span>
                        )}
                      </div>

                      {!result.isFullyCovered ? (
                        <span className="text-red-700 font-bold font-mono tabular-nums">
                          عجز في الرصيد الصالح: ينقص {result.shortage} {item?.unit}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold">
                          مغطى بالكامل من التشغيلات الصالحة
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
                  <div className="text-xs text-slate-500">
                    سيتم خصم الكميات من الباتشات الموضحة أعلاه وتوثيق أرقام التشغيلات في ملف المريض الطبي.
                  </div>
                  <button
                    type="button"
                    disabled={submittingDispense}
                    onClick={handleConfirmDispense}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap"
                  >
                    <CheckCircle2 size={18} />
                    {submittingDispense
                      ? 'جاري خصم الباتشات وتوثيق الصرف...'
                      : 'اعتماد الصرف وخصم الباتشات الآن'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: PRESCRIPTIONS & DIALYSIS MEDICATION QUEUES
      ===================================================================== */}
      {activeTab === 'queues' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Clinic Prescriptions Queue */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">روشتات العيادات المحولة للصيدلية</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  المواعيد والزيارات التي سجل فيها الطبيب روشتة علاجية
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                الإجمالي: {clinicQueue.length}
              </span>
            </div>

            {clinicQueue.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                لا توجد روشتات عيادات مسجلة حالياً.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[540px] overflow-y-auto">
                {clinicQueue.map(apt => (
                  <div key={apt.id} className="py-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          {apt.patients?.name || 'مريض'}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          <span>{apt.clinics?.name || 'العيادة'}</span>
                          <span className="mx-1.5">·</span>
                          <span>د. {apt.doctors?.name || 'غير محدد'}</span>
                          <span className="mx-1.5">·</span>
                          <span className="font-mono tabular-nums">{apt.date}</span>
                        </div>
                      </div>

                      {apt.dispensedOrder ? (
                        <span className="text-xs font-bold text-emerald-700 font-mono">
                          تم الصرف ({apt.dispensedOrder.order_number})
                        </span>
                      ) : (
                        <button
                          onClick={() => handleLoadFromClinicQueue(apt)}
                          className="px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                        >
                          تحويل لشاشة الصرف <ArrowLeft size={14} />
                        </button>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 whitespace-pre-wrap">
                      <span className="font-bold text-slate-900">الروشتة: </span>
                      {apt.prescription}
                      {apt.diagnosis && (
                        <div className="text-slate-500 mt-1">التشخيص: {apt.diagnosis}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dialysis Sessions Medication Queue */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">طلبات أدوية جلسات الغسيل الكلوي</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  الجلسات النشطة واليومية والأدوية المقررة بجدول إعطاء الأدوية (MAR)
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                الإجمالي: {dialysisQueue.length}
              </span>
            </div>

            {dialysisQueue.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                لا توجد جلسات غسيل مسجلة حالياً.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[540px] overflow-y-auto">
                {dialysisQueue.map(sess => {
                  const p = patients.find(pt => pt.id === sess.patient_id);
                  return (
                    <div key={sess.id} className="py-4 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            {p?.name || 'مريض غسيل كلوي'}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            <span>غرفة {sess.room}</span>
                            <span className="mx-1.5">·</span>
                            <span className="font-mono tabular-nums">{sess.date}</span>
                            <span className="mx-1.5">·</span>
                            <span>
                              الحالة:{' '}
                              {sess.status === 'ACTIVE'
                                ? 'جلسة نشطة الآن'
                                : sess.status === 'WAITING'
                                ? 'بالانتظار'
                                : 'مكتملة'}
                            </span>
                          </div>
                        </div>

                        {sess.dispensedOrder ? (
                          <span className="text-xs font-bold text-emerald-700 font-mono">
                            تم الصرف ({sess.dispensedOrder.order_number})
                          </span>
                        ) : (
                          <button
                            onClick={() => handleLoadFromDialysisQueue(sess)}
                            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                          >
                            تخصيص الباتشات والصرف <ArrowLeft size={14} />
                          </button>
                        )}
                      </div>

                      {sess.medications && sess.medications.length > 0 ? (
                        <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200/70 text-xs space-y-1">
                          <div className="font-bold text-teal-900">الأدوية المسجلة بالجلسة (MAR):</div>
                          {sess.medications.map((m: any) => (
                            <div key={m.id} className="text-slate-700 flex items-center gap-2">
                              <span className="font-bold">{m.drug_name}</span>
                              {m.dose && <span>({m.dose})</span>}
                              {m.route && <span>— {m.route}</span>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">
                          يمكنك الضغط على «تخصيص الباتشات والصرف» لصرف مستلزمات أو أدوية الجلسة مباشرة.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: MEDICATIONS CATALOG & BATCH INVENTORY (FEFO/FIFO ORDER)
      ===================================================================== */}
      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Master List of Medications (6 cols) */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">دليل الأدوية والمستحضرات</h2>
                <p className="text-xs text-slate-500">اختر أي دواء لعرض وإدارة التشغيلات (الباتشات) الخاصة به</p>
              </div>
              <button
                onClick={() => {
                  setEditingItem({
                    trade_name: '',
                    generic_name: '',
                    dosage_form: 'أقراص',
                    strength: '',
                    unit: 'علبة',
                    min_stock_level: 10,
                    storage_conditions: 'درجة حرارة الغرفة (أقل من 25°C)',
                    is_active: true
                  });
                  setShowItemModal(true);
                }}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
              >
                <Plus size={15} /> صنف جديد
              </button>
            </div>

            <div className="relative">
              <Search size={16} className="absolute right-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                placeholder="بحث بالاسم التجاري، الاسم العلمي، أو الكود..."
                className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-primary-500 outline-none"
              />
            </div>

            {filteredCatalogItems.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-xl">
                لا توجد أصناف دوائية مطابقة. اضغط «تعريف دواء جديد» لإضافة أول صنف.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {filteredCatalogItems.map(item => {
                  const m = itemMetricsMap.get(item.id);
                  const validStock = m?.validStock || 0;
                  const isLow = validStock <= Number(item.min_stock_level);
                  const isSelected = selectedCatalogItem?.id === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedCatalogItem(item)}
                      className={`p-4 cursor-pointer transition-colors rounded-xl ${
                        isSelected ? 'bg-primary-50/70 border border-primary-200' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-900 text-base">
                            {item.trade_name}{' '}
                            {item.strength && (
                              <span className="text-xs font-mono text-slate-600">({item.strength})</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            <span>{item.generic_name || 'بدون اسم علمي'}</span>
                            <span className="mx-1.5">·</span>
                            <span>{item.dosage_form}</span>
                            {item.code && (
                              <>
                                <span className="mx-1.5">·</span>
                                <span className="font-mono">{item.code}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-left shrink-0">
                          <div
                            className={`text-lg font-bold font-mono tabular-nums ${
                              validStock === 0
                                ? 'text-red-700'
                                : isLow
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {validStock} <span className="text-xs font-sans font-normal">{item.unit}</span>
                          </div>
                          <div className="text-xs text-slate-500">
                            باتشات صالحة: <span className="font-mono tabular-nums">{m?.activeBatchesCount || 0}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                        <div>
                          {m?.nextBatch ? (
                            <span>
                              يصرف أولاً: باتش{' '}
                              <strong className="font-mono text-slate-900">{m.nextBatch.batch_number}</strong>{' '}
                              (ينتهي <span className="font-mono">{m.nextBatch.expiry_date}</span>)
                            </span>
                          ) : (
                            <span className="text-red-600">لا يوجد باتش صالح للصرف حالياً</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setNewBatchForm({
                                item_id: item.id,
                                batch_number: '',
                                production_date: '',
                                expiry_date: '',
                                received_date: todayStr,
                                initial_quantity: 20,
                                supplier_name: '',
                                notes: ''
                              });
                              setShowBatchModal(true);
                            }}
                            className="text-primary-700 hover:underline font-bold"
                          >
                            + توريد باتش
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setEditingItem(item);
                              setShowItemModal(true);
                            }}
                            className="text-slate-600 hover:text-slate-900"
                          >
                            تعديل
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detailed Batches of Selected Medication (6 cols) */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            {!selectedCatalogItem ? (
              <div className="py-20 text-center space-y-2 text-slate-500">
                <Layers size={40} className="mx-auto text-slate-300" />
                <div className="text-sm font-bold text-slate-700">اختر صنفاً دوائياً من القائمة</div>
                <p className="text-xs">لعرض سجل التشغيلات (الباتشات) مرتباً حسب أولوية الصرف FEFO / FIFO</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      تشغيلات (باتشات) الدواء: {selectedCatalogItem.trade_name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      مرتبة تلقائياً حسب الأقرب انتهاء صلاحية (FEFO) ثم الأقدم توريداً (FIFO)
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setNewBatchForm({
                        item_id: selectedCatalogItem.id,
                        batch_number: '',
                        production_date: '',
                        expiry_date: '',
                        received_date: todayStr,
                        initial_quantity: 20,
                        supplier_name: '',
                        notes: ''
                      });
                      setShowBatchModal(true);
                    }}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <PackagePlus size={15} /> إضافة باتش لهذا الدواء
                  </button>
                </div>

                {(() => {
                  const m = itemMetricsMap.get(selectedCatalogItem.id);
                  const itemBatches = m?.orderedBatches || [];
                  if (itemBatches.length === 0) {
                    return (
                      <div className="py-12 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-xl">
                        لا توجد باتشات مسجلة لهذا الدواء بعد. اضغط «إضافة باتش لهذا الدواء» لتوريد أول تشغيلة.
                      </div>
                    );
                  }

                  let activePriorityCounter = 0;

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3 font-bold">ترتيب الصرف</th>
                            <th className="py-2.5 px-3 font-bold">رقم الباتش</th>
                            <th className="py-2.5 px-3 font-bold">الصلاحية (FEFO)</th>
                            <th className="py-2.5 px-3 font-bold">التوريد (FIFO)</th>
                            <th className="py-2.5 px-3 font-bold">الوارد / المتبقي</th>
                            <th className="py-2.5 px-3 font-bold">الحالة والإجراء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {itemBatches.map(b => {
                            const daysLeft = getDaysUntilExpiry(b.expiry_date);
                            const isExpired = daysLeft < 0 || b.status === 'EXPIRED';
                            const isEligible =
                              b.status === 'ACTIVE' && !isExpired && Number(b.remaining_quantity) > 0;
                            if (isEligible) activePriorityCounter++;

                            return (
                              <tr key={b.id} className="hover:bg-slate-50">
                                <td className="py-3 px-3 font-mono tabular-nums">
                                  {isEligible ? (
                                    <span className="font-bold text-emerald-700">
                                      #{activePriorityCounter}{' '}
                                      {activePriorityCounter === 1 ? '(يصرف أولاً)' : ''}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">غير مدرج بالصرف</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 font-mono tabular-nums font-bold text-slate-900">
                                  {b.batch_number}
                                  {b.supplier_name && (
                                    <div className="text-[11px] font-sans font-normal text-slate-500">
                                      {b.supplier_name}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3 font-mono tabular-nums">
                                  <div
                                    className={
                                      isExpired
                                        ? 'text-red-700 font-bold'
                                        : daysLeft <= 90
                                        ? 'text-amber-700 font-bold'
                                        : 'text-slate-800'
                                    }
                                  >
                                    {b.expiry_date}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {isExpired ? `منتهي منذ ${Math.abs(daysLeft)} يوم` : `متبقي ${daysLeft} يوم`}
                                  </div>
                                </td>
                                <td className="py-3 px-3 font-mono tabular-nums text-slate-600">
                                  {b.received_date}
                                </td>
                                <td className="py-3 px-3 font-mono tabular-nums">
                                  <span className="font-bold text-slate-900">{b.remaining_quantity}</span>
                                  <span className="text-slate-400"> / {b.initial_quantity}</span>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`font-bold ${
                                        isExpired
                                          ? 'text-red-700'
                                          : b.status === 'QUARANTINED'
                                          ? 'text-amber-700'
                                          : b.remaining_quantity === 0 || b.status === 'DEPLETED'
                                          ? 'text-slate-400'
                                          : 'text-emerald-700'
                                      }`}
                                    >
                                      {isExpired
                                        ? 'منتهي الصلاحية'
                                        : b.status === 'QUARANTINED'
                                        ? 'محجور'
                                        : b.remaining_quantity === 0 || b.status === 'DEPLETED'
                                        ? 'نفد بالكامل'
                                        : 'نشط'}
                                    </span>

                                    {b.status === 'ACTIVE' && b.remaining_quantity > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => handleChangeBatchStatus(b, 'QUARANTINED')}
                                        className="text-amber-700 hover:underline text-[11px]"
                                        title="حجر الباتش ومنع صرفه مؤقتاً"
                                      >
                                        حجر
                                      </button>
                                    )}
                                    {b.status === 'QUARANTINED' && !isExpired && (
                                      <button
                                        type="button"
                                        onClick={() => handleChangeBatchStatus(b, 'ACTIVE')}
                                        className="text-emerald-700 hover:underline text-[11px]"
                                      >
                                        تفعيل
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: TRACEABILITY LOG & EXPIRY RADAR
      ===================================================================== */}
      {activeTab === 'traceability' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
              <button
                onClick={() => setTraceSubView('orders')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                  traceSubView === 'orders'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                سجل أذونات الصرف وتتبع التشغيلات ({dispenseOrders.length})
              </button>
              <button
                onClick={() => setTraceSubView('expiry_radar')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                  traceSubView === 'expiry_radar'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                رادار الصلاحيات والباتشات الحرجة ({expiryRadarBatches.length})
              </button>
            </div>

            {traceSubView === 'orders' ? (
              <div className="relative w-full sm:w-80">
                <Search size={15} className="absolute right-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={traceSearch}
                  onChange={e => setTraceSearch(e.target.value)}
                  placeholder="ابحث برقم الباتش، اسم المريض، أو اسم الدواء..."
                  className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-primary-500 outline-none"
                />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setExpiryFilter('ALL_ALERTS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    expiryFilter === 'ALL_ALERTS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  الكل
                </button>
                <button
                  onClick={() => setExpiryFilter('EXPIRING_SOON')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    expiryFilter === 'EXPIRING_SOON' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  قريبة الانتهاء (&le; 90 يوم)
                </button>
                <button
                  onClick={() => setExpiryFilter('EXPIRED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    expiryFilter === 'EXPIRED' ? 'bg-white text-red-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  منتهية الصلاحية
                </button>
                <button
                  onClick={() => setExpiryFilter('QUARANTINED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    expiryFilter === 'QUARANTINED' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  محجورة
                </button>
              </div>
            )}
          </div>

          {traceSubView === 'orders' ? (
            filteredDispenseOrders.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500">
                لا توجد حركات صرف مسجلة تطابق البحث.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDispenseOrders.map(order => (
                  <div
                    key={order.id}
                    className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono tabular-nums font-bold text-sm text-primary-700">
                            {order.order_number}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="font-bold text-slate-900 text-sm">
                            المريض: {order.patients?.name || 'مريض'}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-600">
                            {order.source_type === 'CLINIC_PRESCRIPTION'
                              ? 'روشتة عيادة'
                              : order.source_type === 'DIALYSIS_SESSION'
                              ? 'جلسة غسيل كلوي'
                              : 'صرف مباشر'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          <span>تاريخ الصرف: </span>
                          <span className="font-mono tabular-nums">
                            {new Date(order.dispensed_at).toLocaleString('ar-EG')}
                          </span>
                          <span className="mx-1.5">·</span>
                          <span>بواسطة: {order.dispensed_by}</span>
                          {order.prescribing_doctor && (
                            <>
                              <span className="mx-1.5">·</span>
                              <span>الطبيب: {order.prescribing_doctor}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => setPrintableOrder(order)}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5"
                      >
                        <Printer size={14} /> طباعة إيصال التتبع
                      </button>
                    </div>

                    <div className="overflow-x-auto bg-slate-50 rounded-lg border border-slate-200">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3 font-bold">الصنف الدوائي</th>
                            <th className="py-2 px-3 font-bold">رقم الباتش المنصرف منه</th>
                            <th className="py-2 px-3 font-bold">تاريخ صلاحية الباتش</th>
                            <th className="py-2 px-3 font-bold">الكمية المنصرفة</th>
                            <th className="py-2 px-3 font-bold">إرشادات الاستخدام</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60">
                          {(order.pharmacy_dispense_items || []).map(di => (
                            <tr key={di.id}>
                              <td className="py-2 px-3 font-bold text-slate-900">
                                {di.pharmacy_items?.trade_name || 'دواء'}{' '}
                                {di.pharmacy_items?.strength ? `(${di.pharmacy_items.strength})` : ''}
                              </td>
                              <td className="py-2 px-3 font-mono tabular-nums font-bold text-primary-700">
                                {di.batch_number_snapshot}
                              </td>
                              <td className="py-2 px-3 font-mono tabular-nums text-slate-700">
                                {di.expiry_date_snapshot}
                              </td>
                              <td className="py-2 px-3 font-mono tabular-nums font-bold text-slate-900">
                                {di.quantity} {di.pharmacy_items?.unit || ''}
                              </td>
                              <td className="py-2 px-3 text-slate-600">
                                {di.dosage_instructions || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : expiryRadarBatches.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              لا توجد باتشات منتهية أو قريبة الانتهاء ضمن هذا التصنيف.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">الدواء</th>
                    <th className="py-2.5 px-3 font-bold">رقم الباتش</th>
                    <th className="py-2.5 px-3 font-bold">تاريخ الانتهاء</th>
                    <th className="py-2.5 px-3 font-bold">الفترة المتبقية</th>
                    <th className="py-2.5 px-3 font-bold">الرصيد المتبقي</th>
                    <th className="py-2.5 px-3 font-bold">الحالة الرقابية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expiryRadarBatches.map(b => {
                    const days = getDaysUntilExpiry(b.expiry_date);
                    const isExpired = days < 0 || b.status === 'EXPIRED';
                    return (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {b.pharmacy_items?.trade_name || 'دواء'}
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums font-bold">{b.batch_number}</td>
                        <td className="py-3 px-3 font-mono tabular-nums">{b.expiry_date}</td>
                        <td
                          className={`py-3 px-3 font-mono tabular-nums font-bold ${
                            isExpired ? 'text-red-700' : 'text-amber-700'
                          }`}
                        >
                          {isExpired ? `منتهي منذ ${Math.abs(days)} يوم` : `${days} يوم`}
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums font-bold">
                          {b.remaining_quantity} {b.pharmacy_items?.unit || ''}
                        </td>
                        <td className="py-3 px-3">
                          {isExpired ? (
                            <span className="text-red-700 font-bold">
                              محجوب آلياً عن الصرف (منتهي الصلاحية)
                            </span>
                          ) : b.status === 'QUARANTINED' ? (
                            <span className="text-amber-800 font-bold">محجور دوائياً</span>
                          ) : (
                            <span className="text-amber-700 font-bold">
                              أولوية قصوى بالصرف التلقائي (FEFO)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          MODAL 1: ADD / EDIT MEDICATION ITEM
      ===================================================================== */}
      {showItemModal && editingItem && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingItem.id ? 'تعديل بيانات الصنف الدوائي' : 'تعريف صنف دوائي جديد'}
              </h3>
              <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveMedicationItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم التجاري للدواء *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.trade_name || ''}
                    onChange={e => setEditingItem({ ...editingItem, trade_name: e.target.value })}
                    placeholder="مثال: Eprex 4000 IU"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم العلمي (Generic Name)</label>
                  <input
                    type="text"
                    value={editingItem.generic_name || ''}
                    onChange={e => setEditingItem({ ...editingItem, generic_name: e.target.value })}
                    placeholder="مثال: Epoetin alfa"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الشكل الصيدلاني</label>
                  <select
                    value={editingItem.dosage_form || 'أقراص'}
                    onChange={e => setEditingItem({ ...editingItem, dosage_form: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    {DOSAGE_FORMS.map(df => (
                      <option key={df} value={df}>
                        {df}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">التركيز (Strength)</label>
                  <input
                    type="text"
                    value={editingItem.strength || ''}
                    onChange={e => setEditingItem({ ...editingItem, strength: e.target.value })}
                    placeholder="مثال: 500mg أو 5000 IU"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وحدة الصرف</label>
                  <select
                    value={editingItem.unit || 'علبة'}
                    onChange={e => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    {DISPENSE_UNITS.map(u => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">كود الصنف / الباركود</label>
                  <input
                    type="text"
                    value={editingItem.code || ''}
                    onChange={e => setEditingItem({ ...editingItem, code: e.target.value })}
                    placeholder="مثال: MED-101"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">حد إعادة الطلب الأدنى</label>
                  <input
                    type="number"
                    min={0}
                    value={editingItem.min_stock_level ?? 10}
                    onChange={e => setEditingItem({ ...editingItem, min_stock_level: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">شروط التخزين والحفظ</label>
                <input
                  type="text"
                  value={editingItem.storage_conditions || ''}
                  onChange={e => setEditingItem({ ...editingItem, storage_conditions: e.target.value })}
                  placeholder="مثال: يحفظ بالثلاجة (2°C - 8°C)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold"
                >
                  حفظ الصنف الدوائي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: RECEIVE NEW BATCH (FEFO / FIFO ENTRY)
      ===================================================================== */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">توريد تشغيلة (باتش) جديدة</h3>
                <p className="text-xs text-slate-500">
                  ستُدرج التشغيلة تلقائياً في خوارزمية الصرف حسب تاريخ انتهاء الصلاحية ثم تاريخ التوريد
                </p>
              </div>
              <button onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveNewBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الصنف الدوائي *</label>
                <select
                  required
                  value={newBatchForm.item_id}
                  onChange={e => setNewBatchForm({ ...newBatchForm, item_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                >
                  <option value="">-- اختر الدواء --</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.trade_name} {i.strength ? `(${i.strength})` : ''} — الوحدة: {i.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الباتش / التشغيلة (Batch #) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newBatchForm.batch_number}
                    onChange={e => setNewBatchForm({ ...newBatchForm, batch_number: e.target.value })}
                    placeholder="مثال: LOT-2026-09A"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الكمية الواردة بالباتش *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newBatchForm.initial_quantity}
                    onChange={e =>
                      setNewBatchForm({ ...newBatchForm, initial_quantity: Math.max(1, Number(e.target.value)) })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono tabular-nums font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الإنتاج</label>
                  <input
                    type="date"
                    value={newBatchForm.production_date}
                    onChange={e => setNewBatchForm({ ...newBatchForm, production_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">
                    تاريخ الانتهاء (FEFO) *
                  </label>
                  <input
                    type="date"
                    required
                    value={newBatchForm.expiry_date}
                    onChange={e => setNewBatchForm({ ...newBatchForm, expiry_date: e.target.value })}
                    className="w-full p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ التوريد (FIFO) *</label>
                  <input
                    type="date"
                    required
                    value={newBatchForm.received_date}
                    onChange={e => setNewBatchForm({ ...newBatchForm, received_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المورد / شركة التوزيع</label>
                <input
                  type="text"
                  value={newBatchForm.supplier_name}
                  onChange={e => setNewBatchForm({ ...newBatchForm, supplier_name: e.target.value })}
                  placeholder="مثال: الشركة المصرية لتجارة الأدوية"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold"
                >
                  حفظ وتوريد الباتش
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: PRINTABLE DISPENSE & BATCH TRACEABILITY RECEIPT
      ===================================================================== */}
      {printableOrder && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
              <h3 className="text-lg font-bold text-slate-900">
                إيصال صرف دوائي وتتبع التشغيلات ({printableOrder.order_number})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer size={15} /> طباعة الإيصال
                </button>
                <button
                  onClick={() => setPrintableOrder(null)}
                  className="p-2 text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="text-base font-bold text-slate-900">مركز الهداية الطبي — قسم الصيدلية</div>
                  <div className="text-xs text-slate-500">نموذج صرف وتتبع التشغيلات الدوائية (FEFO / FIFO)</div>
                </div>
                <div className="text-left font-mono text-xs">
                  <div className="font-bold text-slate-900">{printableOrder.order_number}</div>
                  <div className="text-slate-500">
                    {new Date(printableOrder.dispensed_at).toLocaleString('ar-EG')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl text-xs">
                <div>
                  <span className="text-slate-500">اسم المريض: </span>
                  <strong className="text-slate-900">{printableOrder.patients?.name || '—'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">مسار الصرف: </span>
                  <strong className="text-slate-900">
                    {printableOrder.source_type === 'CLINIC_PRESCRIPTION'
                      ? 'روشتة عيادة'
                      : printableOrder.source_type === 'DIALYSIS_SESSION'
                      ? 'جلسة غسيل كلوي'
                      : 'صرف مباشر'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">الطبيب المعالج: </span>
                  <strong className="text-slate-900">{printableOrder.prescribing_doctor || '—'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">الصيدلي القائم بالصرف: </span>
                  <strong className="text-slate-900">{printableOrder.dispensed_by}</strong>
                </div>
              </div>

              <table className="w-full text-right text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">الدواء</th>
                    <th className="py-2 px-3">رقم الباتش (LOT)</th>
                    <th className="py-2 px-3">تاريخ الانتهاء</th>
                    <th className="py-2 px-3">الكمية</th>
                    <th className="py-2 px-3">طريقة الاستخدام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(printableOrder.pharmacy_dispense_items || []).map(di => (
                    <tr key={di.id}>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {di.pharmacy_items?.trade_name || 'دواء'}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums font-bold">
                        {di.batch_number_snapshot}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums">{di.expiry_date_snapshot}</td>
                      <td className="py-2 px-3 font-mono tabular-nums font-bold">
                        {di.quantity} {di.pharmacy_items?.unit || ''}
                      </td>
                      <td className="py-2 px-3">{di.dosage_instructions || 'حسب إرشادات الطبيب'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* بطاقة القرار السريري الموحدة 360 */}
      <PatientClinical360Modal
        isOpen={!!patientFor360}
        onClose={() => setPatientFor360(null)}
        patient={patientFor360}
        onDataUpdated={loadAllPharmacyData}
      />
    </div>
  );
};

export default PharmacyModule;
