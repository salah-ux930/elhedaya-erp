import React, { useState, useEffect, useMemo } from 'react';
import { DB } from '../store.ts';
import { calculateAge } from '../constants.ts';
import PatientTimeline from '../components/PatientTimeline.tsx';
import FamilyComprehensiveHealthRecordModal from '../components/FamilyComprehensiveHealthRecordModal.tsx';
import MedicalRecordsAlertsBanner from '../components/MedicalRecordsAlertsBanner.tsx';
import {
  Search,
  History,
  Calendar,
  Loader2,
  Stethoscope,
  Users,
  LibraryBig,
  FolderOpen,
  FileText,
  Phone,
  X
} from 'lucide-react';

const MedicalRecordsModule: React.FC = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [familyFiles, setFamilyFiles] = useState<any[]>([]);
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Modals state
  const [selectedTimelinePatient, setSelectedTimelinePatient] = useState<any | null>(null);
  const [showComprehensiveModal, setShowComprehensiveModal] = useState(false);
  const [comprehensivePatient, setComprehensivePatient] = useState<any | null>(null);
  const [comprehensiveFamilyFile, setComprehensiveFamilyFile] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [apptsData, filesData, patientsData] = await Promise.all([
        DB.getClinicAppointments ? DB.getClinicAppointments() : Promise.resolve([]),
        DB.getFamilyFiles(),
        DB.getPatients()
      ]);
      setAppointments(apptsData || []);
      setFamilyFiles(filesData || []);
      setPatientsList(patientsData || []);
    } catch (e: any) {
      console.error(e);
      setLoadError(e?.message || 'تعذر تحميل بيانات الأرشيف الطبي. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenComprehensive = (patient: any) => {
    if (!patient) return;
    const linked = familyFiles.find((ff) =>
      ff.members?.some((m: any) => m.patient_id === patient.id || m.patients?.id === patient.id)
    );
    setComprehensivePatient(patient);
    setComprehensiveFamilyFile(linked || null);
    setShowComprehensiveModal(true);
  };

  const archiveRows = useMemo(() => {
    return patientsList
      .map((patient) => {
        const linkedFile = familyFiles.find((ff) =>
          ff.members?.some((m: any) => m.patient_id === patient.id || m.patients?.id === patient.id)
        );
        const patientAppointments = appointments
          .filter((a) => a.patient_id === patient.id)
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        const latestVisit = patientAppointments[0] || null;

        return {
          patient,
          linkedFile,
          visitsCount: patientAppointments.length,
          latestVisit,
          patientAppointments
        };
      })
      .filter((row) => {
        const q = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !q ||
          (row.patient.name || '').toLowerCase().includes(q) ||
          (row.patient.national_id || '').toLowerCase().includes(q) ||
          (row.patient.phone || '').toLowerCase().includes(q) ||
          (row.linkedFile?.family_code || '').toLowerCase().includes(q);

        const matchesDate = filterDate
          ? row.patientAppointments.some((a) => a.date === filterDate)
          : true;

        return matchesSearch && matchesDate;
      });
  }, [patientsList, familyFiles, appointments, searchTerm, filterDate]);

  if (selectedTimelinePatient) {
    return (
      <PatientTimeline
        patient={selectedTimelinePatient}
        onClose={() => setSelectedTimelinePatient(null)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20" dir="rtl">
      {/* Header: الأرشيف الطبي العام */}
      <div className="bg-gradient-to-r from-slate-900 via-primary-950 to-slate-900 text-white p-6 rounded-[2.5rem] shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary-600/30 border border-primary-400/30 flex items-center justify-center text-primary-200 shrink-0">
            <LibraryBig size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-black">الأرشيف الطبي</h2>
              <span className="bg-primary-500/30 text-primary-100 border border-primary-400/40 text-xs px-3 py-1 rounded-full font-bold">
                أرشيف السجلات والزيارات الطبية
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              استعراض وبحث شامل في أرشيف ملفات المرضى، الزيارات السابقة، الفحوصات، والملفات الصحية العائلية.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={loadData}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/10 transition-all flex items-center gap-2 text-xs font-bold cursor-pointer"
            title="تحديث الأرشيف"
          >
            <History size={16} /> تحديث الأرشيف
          </button>
        </div>
      </div>

      {loadError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-rose-800 text-sm font-bold">
            <span>{loadError}</span>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Real-time Clinical Alerts Banner */}
      <MedicalRecordsAlertsBanner
        onOpenComprehensivePatient={handleOpenComprehensive}
        onOpenTimelinePatient={setSelectedTimelinePatient}
        allPatients={patientsList}
      />

      {/* Search & Filter Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-96">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="بحث في الأرشيف بالاسم، الرقم القومي، الهاتف، أو كود الأسرة..."
              className="w-full pr-12 pl-10 py-4 border-2 border-transparent rounded-[1.5rem] outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 bg-white shadow-sm font-bold transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                title="مسح البحث"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="relative w-full sm:w-56">
            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="date"
              className="w-full pr-12 pl-4 py-4 border-2 border-transparent rounded-[1.5rem] outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 bg-white shadow-sm font-bold transition-all text-sm"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              title="تصفية حسب تاريخ الزيارة"
            />
          </div>
          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-colors"
            >
              إلغاء فلتر التاريخ
            </button>
          )}
        </div>

        <div className="text-xs font-bold text-slate-500 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs">
          إجمالي السجلات المؤرشفة: <span className="font-black text-primary-700 font-mono">{archiveRows.length}</span>
        </div>
      </div>

      {/* Archive Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="animate-spin text-primary-600" size={48} />
            <p className="font-black text-gray-400">جاري استرجاع بيانات الأرشيف الطبي...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-5 font-black text-gray-400 text-xs">المريض والبيانات الأساسية</th>
                  <th className="px-6 py-5 font-black text-gray-400 text-xs">الملف العائلي</th>
                  <th className="px-6 py-5 font-black text-gray-400 text-xs">آخر زيارة / كشف مسجل</th>
                  <th className="px-6 py-5 font-black text-gray-400 text-xs text-center">إجمالي الزيارات</th>
                  <th className="px-6 py-5 font-black text-gray-400 text-xs text-center no-print">إجراءات الأرشيف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {archiveRows.map(({ patient, linkedFile, visitsCount, latestVisit }) => (
                  <tr key={patient.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3 text-right">
                        <div className="w-11 h-11 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-700 font-black border border-primary-100 shadow-sm shrink-0">
                          {patient?.name?.[0] || 'م'}
                        </div>
                        <div>
                          <button
                            onClick={() => handleOpenComprehensive(patient)}
                            className="font-black text-slate-900 text-base leading-tight hover:text-primary-600 transition-colors text-right cursor-pointer"
                            title="فتح الملف الصحي الشامل للمريض"
                          >
                            {patient?.name || 'غير معروف'}
                          </button>
                          <div className="text-[11px] text-slate-500 font-mono mt-1 flex flex-wrap items-center gap-2.5">
                            <span>الرقم القومي: {patient?.national_id || '—'}</span>
                            <span>•</span>
                            <span>{calculateAge(patient?.date_of_birth)}</span>
                            {patient?.phone && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1">
                                  <Phone size={11} /> {patient.phone}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      {linkedFile ? (
                        <div className="inline-flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full font-black border border-emerald-200">
                          <FolderOpen size={13} className="text-emerald-600" />
                          <span>{linkedFile.family_code}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-bold">غير مرتبط بملف عائلي</span>
                      )}
                    </td>

                    <td className="px-6 py-5">
                      {latestVisit ? (
                        <div className="space-y-0.5">
                          <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <Calendar size={13} className="text-primary-600" />
                            <span className="font-mono">{latestVisit.date}</span>
                            {latestVisit.clinics?.name && (
                              <span className="text-primary-700">({latestVisit.clinics.name})</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-bold truncate max-w-xs">
                            {latestVisit.diagnosis
                              ? `التشخيص: ${latestVisit.diagnosis}`
                              : latestVisit.doctors?.name
                              ? `د/ ${latestVisit.doctors.name}`
                              : 'زيارة مسجلة بالأرشيف'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-bold">ملف طبي أساسي (بدون زيارات مسجلة)</span>
                      )}
                    </td>

                    <td className="px-6 py-5 text-center">
                      <span className="px-3 py-1 rounded-xl text-xs font-black font-mono bg-slate-100 text-slate-700 border border-slate-200">
                        {visitsCount}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-center no-print">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenComprehensive(patient)}
                          className="px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                          title="فتح الملف الصحي الشامل للمريض"
                        >
                          <Stethoscope size={14} />
                          <span>الملف الصحي الشامل</span>
                        </button>

                        <button
                          onClick={() => setSelectedTimelinePatient(patient)}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-200 cursor-pointer"
                          title="عرض الأرشيف الزمني والسجلات الطبية للمريض"
                        >
                          <FileText size={14} className="text-primary-600" />
                          <span>الأرشيف الزمني</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {archiveRows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="py-32 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-400 font-black">
                        <LibraryBig size={48} className="opacity-40" />
                        <span>لا توجد سجلات في الأرشيف تطابق معايير البحث الحالية</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* مودال الملف الصحي الشامل للمريض المختار */}
      {showComprehensiveModal && comprehensivePatient && (
        <FamilyComprehensiveHealthRecordModal
          isOpen={showComprehensiveModal}
          onClose={() => {
            setShowComprehensiveModal(false);
            setComprehensivePatient(null);
            setComprehensiveFamilyFile(null);
          }}
          patient={comprehensivePatient}
          familyFile={comprehensiveFamilyFile || undefined}
        />
      )}
    </div>
  );
};

export default MedicalRecordsModule;
