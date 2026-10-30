import { supabase } from '../supabase.ts';
import { DB } from '../store.ts';

export interface ClinicalAlert {
  id: string;
  category: 'URGENT_LAB' | 'CRITICAL_VITALS' | 'CLINICAL_ALERT' | 'FALL_RISK_CHECK';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  patient_id?: string;
  patient_name: string;
  patient_national_id?: string;
  session_id?: string;
  review_stage?: '2_HOURS' | '4_HOURS' | string;
  source_table: string;
  source_id: string;
  parameter_name: string;
  recorded_value: string | number;
  reference_range?: string;
  clinical_action?: string;
  timestamp: string;
  is_read: boolean;
  acknowledged_at?: string;
  acknowledged_by?: string;
}

export type RealtimeConnectionStatus = 'connecting' | 'websocket_connected' | 'polling_active' | 'disconnected';

type AlertListener = (alerts: ClinicalAlert[], newAlert?: ClinicalAlert) => void;
type StatusListener = (status: RealtimeConnectionStatus, lastPing: Date) => void;

class RealtimeNotificationService {
  private alerts: ClinicalAlert[] = [];
  private alertListeners: Set<AlertListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private isSoundMuted: boolean = false;
  private channel: any = null;
  private pollingTimer: any = null;
  private isRunning: boolean = false;
  private connectionStatus: RealtimeConnectionStatus = 'connecting';
  private lastPingTime: Date = new Date();
  private processedSourceIds: Set<string> = new Set();
  private audioCtx: AudioContext | null = null;

  constructor() {
    const savedMute = localStorage.getItem('med_alerts_sound_muted');
    this.isSoundMuted = savedMute === 'true';

    // Load initial cached alerts
    try {
      const cached = localStorage.getItem('med_alerts_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        this.alerts = Array.isArray(parsed) ? parsed : [];
        this.alerts.forEach(a => {
          if (a.source_id) this.processedSourceIds.add(a.source_id);
        });
      }
    } catch (e) {
      console.warn('Could not read cached alerts', e);
    }
  }

  // --- Sound Chime Engine (Synthesized via Web Audio API) ---
  public playAlertSound(severity: 'CRITICAL' | 'WARNING' | 'INFO' = 'CRITICAL') {
    if (this.isSoundMuted) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      if (severity === 'CRITICAL') {
        // High-urgency two-tone medical chime: 880Hz (A5) -> 1174Hz (D6) with pulse
        this.playTone(880, now, 0.15, 'sine');
        this.playTone(1174.66, now + 0.18, 0.22, 'sine');
        this.playTone(880, now + 0.45, 0.15, 'sine');
        this.playTone(1174.66, now + 0.63, 0.35, 'sine');
      } else {
        // Milder warning notification tone
        this.playTone(659.25, now, 0.18, 'sine');
        this.playTone(880, now + 0.2, 0.25, 'sine');
      }
    } catch (err) {
      console.warn('Web Audio playback failed or blocked by autoplay policy:', err);
    }
  }

  private playTone(freq: number, startTime: number, duration: number, type: OscillatorType = 'sine') {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.3, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  public toggleSound(): boolean {
    this.isSoundMuted = !this.isSoundMuted;
    localStorage.setItem('med_alerts_sound_muted', String(this.isSoundMuted));
    if (!this.isSoundMuted) {
      this.playAlertSound('INFO');
    }
    return !this.isSoundMuted;
  }

  public getIsSoundMuted(): boolean {
    return this.isSoundMuted;
  }

  // --- Listener Subscriptions ---
  public subscribe(listener: AlertListener): () => void {
    this.alertListeners.add(listener);
    listener([...this.alerts]);
    return () => {
      this.alertListeners.delete(listener);
    };
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.connectionStatus, this.lastPingTime);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private notifyAlerts(newAlert?: ClinicalAlert) {
    // Keep max 60 alerts
    if (this.alerts.length > 60) {
      this.alerts = this.alerts.slice(0, 60);
    }
    try {
      localStorage.setItem('med_alerts_cache', JSON.stringify(this.alerts));
    } catch (e) {
      // quota safeguard
    }
    this.alertListeners.forEach(fn => fn([...this.alerts], newAlert));
  }

  private setStatus(status: RealtimeConnectionStatus) {
    this.connectionStatus = status;
    this.lastPingTime = new Date();
    this.statusListeners.forEach(fn => fn(status, this.lastPingTime));
  }

  // --- Real-time Engine Init (WebSockets + Polling) ---
  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // 1. Initial data fetch
    this.pollLatestAlerts();

    // 2. Setup Supabase Realtime WebSocket subscription
    this.initWebSocketChannel();

    // 3. Setup polling heartbeat (every 12 seconds) as robust fallback
    this.pollingTimer = setInterval(() => {
      this.pollLatestAlerts();
    }, 12000);
  }

  public stop() {
    this.isRunning = false;
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.setStatus('disconnected');
  }

  private initWebSocketChannel() {
    try {
      this.channel = supabase
        .channel('medical_records_realtime_alerts')
        // Listen to notifications
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications' },
          (payload: any) => {
            this.handleNotificationChange(payload);
          }
        )
        // Listen to lab test updates & inserts
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'lab_tests' },
          (payload: any) => {
            this.handleLabTestChange(payload);
          }
        )
        // Listen to dialysis vital signs (EWS)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'dialysis_vital_signs_ews' },
          (payload: any) => {
            this.handleVitalsChange(payload);
          }
        )
        // Listen to dialysis sessions
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'dialysis_sessions' },
          (payload: any) => {
            this.handleSessionChange(payload);
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            this.setStatus('websocket_connected');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            this.setStatus('polling_active');
          }
        });
    } catch (e) {
      console.warn('Realtime channel init warning, falling back to polling:', e);
      this.setStatus('polling_active');
    }
  }

  // --- Real-time Event Handlers ---
  private async handleNotificationChange(payload: any) {
    this.lastPingTime = new Date();
    const notif = payload.new;
    if (!notif) return;

    if (notif.category === 'URGENT_LAB' || notif.category === 'CRITICAL_VITALS' || notif.category === 'CLINICAL_ALERT') {
      const existing = this.alerts.find(a => a.id === notif.id || (a.source_id && a.source_id === notif.id));
      if (!existing) {
        const meta = notif.metadata || {};
        const alert: ClinicalAlert = {
          id: notif.id,
          category: notif.category,
          severity: notif.severity || (notif.type === 'error' ? 'CRITICAL' : 'WARNING'),
          title: notif.title,
          message: notif.message,
          patient_id: notif.patient_id,
          patient_name: meta.patient_name || 'مريض مسجل',
          patient_national_id: meta.patient_national_id,
          source_table: 'notifications',
          source_id: notif.id,
          parameter_name: meta.parameter_name || 'تنبيه إكلينيكي',
          recorded_value: meta.recorded_value || '',
          reference_range: meta.reference_range,
          clinical_action: meta.clinical_action || 'مراجعة الطبيب المعالج والتدخل الإكلينيكي فوراً',
          timestamp: notif.created_at || new Date().toISOString(),
          is_read: notif.is_read || false,
          acknowledged_at: notif.acknowledged_at,
          acknowledged_by: notif.acknowledged_by
        };
        this.addAlert(alert);
      }
    }
  }

  private async handleLabTestChange(payload: any) {
    this.lastPingTime = new Date();
    const test = payload.new;
    if (!test || test.status !== 'COMPLETED' || !test.result) return;

    const testIdKey = `lab_${test.id}_${test.result}`;
    if (this.processedSourceIds.has(testIdKey)) return;
    this.processedSourceIds.add(testIdKey);

    // Fetch full test details with patient and definition
    try {
      const { data } = await supabase
        .from('lab_tests')
        .select('*, patients(*), lab_test_definitions(*)')
        .eq('id', test.id)
        .single();

      if (data) {
        this.evaluateAndTriggerLabAlert(data);
      }
    } catch (e) {
      console.warn('Error fetching lab test details for alert:', e);
    }
  }

  private async handleVitalsChange(payload: any) {
    this.lastPingTime = new Date();
    const vitals = payload.new;
    if (!vitals) return;

    const vitalsKey = `ews_${vitals.id}`;
    if (this.processedSourceIds.has(vitalsKey)) return;
    this.processedSourceIds.add(vitalsKey);

    try {
      // Fetch patient info from session
      const { data: session } = await supabase
        .from('dialysis_sessions')
        .select('*, patients(*)')
        .eq('id', vitals.session_id)
        .maybeSingle();

      const patient = session?.patients;
      this.evaluateAndTriggerVitalsAlert(vitals, patient, session);
    } catch (e) {
      console.warn('Error evaluating vitals change:', e);
    }
  }

  private async handleSessionChange(payload: any) {
    this.lastPingTime = new Date();
    const session = payload.new;
    if (!session || !session.blood_pressure) return;

    const sessionKey = `session_${session.id}_${session.blood_pressure}`;
    if (this.processedSourceIds.has(sessionKey)) return;
    this.processedSourceIds.add(sessionKey);

    try {
      const { data: fullSession } = await supabase
        .from('dialysis_sessions')
        .select('*, patients(*)')
        .eq('id', session.id)
        .maybeSingle();

      if (fullSession && fullSession.blood_pressure) {
        this.evaluateAndTriggerSessionBPAlert(fullSession);
      }
    } catch (e) {
      console.warn('Error evaluating session BP:', e);
    }
  }

  // --- Clinical Rules Evaluation ---

  public evaluateAndTriggerLabAlert(test: any): ClinicalAlert | null {
    const resultStr = String(test.result || '').trim();
    const defName = test.lab_test_definitions?.name || 'تحليل معملي';
    const patientName = test.patients?.name || 'مريض';
    const patientId = test.patient_id;
    const numVal = parseFloat(resultStr.replace(/[^0-9.-]/g, ''));

    let isUrgent = false;
    let severity: 'CRITICAL' | 'WARNING' = 'WARNING';
    let title = '';
    let message = '';
    let clinicalAction = 'إبلاغ الطبيب المعالج والتقييم السريري العاجل';
    let refRange = test.lab_test_definitions?.normal_range_male || '';

    const lowerName = defName.toLowerCase();
    const lowerResult = resultStr.toLowerCase();

    // 1. Text flags
    const hasUrgentFlag =
      lowerResult.includes('عاجل') ||
      lowerResult.includes('urgent') ||
      lowerResult.includes('critical') ||
      lowerResult.includes('حرجة') ||
      lowerResult.includes('خطر') ||
      lowerResult.includes('مرتفع جدا') ||
      lowerResult.includes('منخفض جدا') ||
      lowerResult.includes('panic') ||
      resultStr.includes('!!') ||
      resultStr.includes('***');

    // 2. Potassium (K+)
    if (lowerName.includes('potassium') || lowerName.includes('بوتاسيوم') || lowerName.includes('k+')) {
      refRange = '3.5 - 5.1 mEq/L';
      if (!isNaN(numVal)) {
        if (numVal >= 6.2) {
          isUrgent = true;
          severity = 'CRITICAL';
          title = `إنذار حرج: ارتفاع خطير في البوتاسيوم (${numVal} mEq/L)`;
          message = `المريض ${patientName}: تركيز البوتاسيوم وصل إلى ${numVal} mEq/L، مما يشكل خطراً وشيكاً لاضطراب كهربية وتوقف عضلة القلب.`;
          clinicalAction = 'إجراء رسم قلب ECG فوراً، إعطاء كالسيوم جلوكونات ومخفضات البوتاسيوم وبدء جلسة غسيل طارئة.';
        } else if (numVal <= 2.8) {
          isUrgent = true;
          severity = 'CRITICAL';
          title = `إنذار حرج: هبوط حاد في البوتاسيوم (${numVal} mEq/L)`;
          message = `المريض ${patientName}: نقص حاد في بوتاسيوم الدم (${numVal} mEq/L) وخطر حدوث اضطراب النظم البطيني.`;
          clinicalAction = 'بدء تعويض البوتاسيوم الوريدي بحذر تحت مراقبة المونيتور.';
        } else if (numVal >= 5.8 || numVal <= 3.2) {
          isUrgent = true;
          severity = 'WARNING';
          title = `تنبيه معملي: قيمة غير طبيعية للبوتاسيوم (${numVal} mEq/L)`;
          message = `المريض ${patientName}: البوتاسيوم خارج النطاق الآمن (${numVal} mEq/L).`;
          clinicalAction = 'مراجعة جرعات الأدوية ومحلول الديلزة.';
        }
      }
    }

    // 3. Hemoglobin (Hb)
    else if (lowerName.includes('hemoglobin') || lowerName.includes('هيموجلوبين') || lowerName.includes('hb') || lowerName.includes('cbc')) {
      refRange = '11.5 - 16.0 g/dL';
      if (!isNaN(numVal)) {
        if (numVal <= 6.5) {
          isUrgent = true;
          severity = 'CRITICAL';
          title = `إنذار حرج: أنيميا حادة وهبوط الهيموجلوبين (${numVal} g/dL)`;
          message = `المريض ${patientName}: انخفاض حاد في الهيموجلوبين (${numVal} g/dL) مع مخاطر نقص الأكسجين الحاد وفشل الدورة الدموية.`;
          clinicalAction = 'طلب نقل كرات دم حمراء مكدسة (PRBCs) فورياً ومراجعة مصادر النزيف.';
        } else if (numVal <= 8.0) {
          isUrgent = true;
          severity = 'WARNING';
          title = `تنبيه عاجل: فقر دم ملحوظ (${numVal} g/dL)`;
          message = `المريض ${patientName}: الهيموجلوبين منخفض عند (${numVal} g/dL).`;
          clinicalAction = 'تعديل جرعات محفزات تكوين كريات الدم الحمر (EPO) والحديد الوريدي.';
        }
      }
    }

    // 4. Creatinine
    else if (lowerName.includes('creatinine') || lowerName.includes('كرياتينين')) {
      refRange = '0.7 - 1.3 mg/dL';
      if (!isNaN(numVal) && numVal >= 9.5) {
        isUrgent = true;
        severity = numVal >= 12 ? 'CRITICAL' : 'WARNING';
        title = `تنبيه معملي: ارتفاع شديد في الكرياتينين (${numVal} mg/dL)`;
        message = `المريض ${patientName}: وظائف الكلى تسجل كرياتينين مرتفع (${numVal} mg/dL).`;
        clinicalAction = 'تقييم كفاءة ومعدل تدفق جلسات الغسيل وفحص وصلة الغسيل.';
      }
    }

    // 5. Blood Glucose (السكر)
    else if (lowerName.includes('glucose') || lowerName.includes('سكر') || lowerName.includes('sugar') || lowerName.includes('rbs')) {
      refRange = '70 - 140 mg/dL';
      if (!isNaN(numVal)) {
        if (numVal <= 55) {
          isUrgent = true;
          severity = 'CRITICAL';
          title = `إنذار حرج: هبوط حاد في سكر الدم (${numVal} mg/dL)`;
          message = `المريض ${patientName}: غيبوبة سكر وشيكة بسبب نقص حاد في الجلوكوز (${numVal} mg/dL).`;
          clinicalAction = 'إعطاء جلوكوز 25% وريدياً فوراً ومتابعة مستوى الوعي.';
        } else if (numVal >= 420) {
          isUrgent = true;
          severity = 'CRITICAL';
          title = `إنذار حرج: ارتفاع مفرط في سكر الدم (${numVal} mg/dL)`;
          message = `المريض ${patientName}: سكر دم شديد الارتفاع (${numVal} mg/dL) مع خطر الحماض الكيتوني السكري.`;
          clinicalAction = 'إعطاء أنسولين سريع المفعول وفحص غازات الدم والأسيتون.';
        }
      }
    }

    // 6. Platelets (الصفائح الدموية)
    else if (lowerName.includes('platelet') || lowerName.includes('صفائح') || lowerName.includes('plt')) {
      refRange = '150,000 - 450,000 /uL';
      if (!isNaN(numVal) && numVal <= 45) {
        isUrgent = true;
        severity = 'CRITICAL';
        title = `إنذار حرج: نقص حاد في الصفائح الدموية (${numVal} ألف)`;
        message = `المريض ${patientName}: خطر النزيف التلقائي الحاد أثناء أو بعد جلسة الغسيل.`;
        clinicalAction = 'إيقاف أو تقليل جرعة الهيبارين تماماً وتجهيز صفائح دموية لنقلها.';
      }
    }

    // 7. General text flag trigger
    if (!isUrgent && hasUrgentFlag) {
      isUrgent = true;
      severity = 'CRITICAL';
      title = `نتيجة تحليل عاجلة وخطيرة: ${defName}`;
      message = `المريض ${patientName}: نتيجة التحليل (${resultStr}) تتضمن مؤشرات حرجة تستدعي التدخل السريع.`;
      clinicalAction = 'مراجعة استشاري المختبر والطبيب المناوب.';
    }

    if (!isUrgent) return null;

    const alert: ClinicalAlert = {
      id: `lab_alert_${test.id}_${Date.now()}`,
      category: 'URGENT_LAB',
      severity,
      title,
      message,
      patient_id: patientId,
      patient_name: patientName,
      patient_national_id: test.patients?.national_id,
      source_table: 'lab_tests',
      source_id: test.id,
      parameter_name: defName,
      recorded_value: resultStr,
      reference_range: refRange,
      clinical_action: clinicalAction,
      timestamp: new Date().toISOString(),
      is_read: false
    };

    this.addAlert(alert);
    this.persistNotificationToDB(alert);
    return alert;
  }

  public evaluateAndTriggerVitalsAlert(vitals: any, patient?: any, session?: any): ClinicalAlert | null {
    const patientName = patient?.name || 'مريض الجلسة';
    const patientId = patient?.id || session?.patient_id;
    const roomName = session?.room ? `غرفة ${session.room}` : '';

    const sysBP = Number(vitals.systolic_bp || 0);
    const hr = Number(vitals.heart_rate || 0);
    const spo2 = Number(vitals.oxygen_saturation || 0);
    const temp = Number(vitals.temperature_celsius || 0);
    const rr = Number(vitals.respiratory_rate || 0);
    const totalEws = Number(vitals.total_ews_score || 0);

    let isUrgent = false;
    let severity: 'CRITICAL' | 'WARNING' = 'WARNING';
    let title = '';
    let message = '';
    let param = '';
    let val = '';
    let clinicalAction = 'تقييم سريري عاجل ومراجعة طبيب الوحدة';

    // 1. Total EWS Score
    if (totalEws >= 5) {
      isUrgent = true;
      severity = totalEws >= 7 ? 'CRITICAL' : 'WARNING';
      param = 'مقياس الإنذار المبكر (EWS)';
      val = `${totalEws} نقاط`;
      title = totalEws >= 7 
        ? `إنذار أحمر: تدهور إكلينيكي حرج EWS (${totalEws} نقاط)`
        : `إنذار أصفر: تدهور في مقياس الإنذار المبكر EWS (${totalEws} نقاط)`;
      message = `المريض ${patientName} (${roomName}): مجموع نقاط الإنذار المبكر وصل إلى ${totalEws}، مما يشير إلى خطر تدهور الوظائف الحيوية.`;
      clinicalAction = vitals.escalation_action || 'استدعاء طبيب العناية / الوحدة فوراً، وتوفير دعم أكسجين ومراقبة مستمرة كل 15 دقيقة.';
    }

    // 2. Severe Blood Pressure Changes
    else if (sysBP >= 190) {
      isUrgent = true;
      severity = 'CRITICAL';
      param = 'ضغط الدم الانقباضي';
      val = `${sysBP} mmHg`;
      title = `إنذار حرج: أزمة ارتفاع ضغط دم شديدة (${sysBP} mmHg)`;
      message = `المريض ${patientName} (${roomName}): ارتفاع انقباضي حاد (${sysBP} mmHg) وخطر اعتلال دماغي أو نزيف.`;
      clinicalAction = 'إعطاء خافض ضغط دم إسعافي وريدياً ومراقبة قاع العين والحالة العصبية.';
    } else if (sysBP > 0 && sysBP <= 85) {
      isUrgent = true;
      severity = 'CRITICAL';
      param = 'ضغط الدم الانقباضي';
      val = `${sysBP} mmHg`;
      title = `إنذار حرج: هبوط حاد في ضغط الدم وصدمة دورية (${sysBP} mmHg)`;
      message = `المريض ${patientName} (${roomName}): هبوط انقباضي خطير (${sysBP} mmHg) ونقص تروية الأعضاء الحيوية.`;
      clinicalAction = 'خفض معدل سحب السوائل (Ultrafiltration) فوراً، وضعية ترندلينبورغ وإعطاء محلول ملحي وريدي تعويضي.';
    }

    // 3. Severe Hypoxemia
    else if (spo2 > 0 && spo2 < 89) {
      isUrgent = true;
      severity = 'CRITICAL';
      param = 'تشبع الأكسجين (SpO2)';
      val = `${spo2}%`;
      title = `إنذار حرج: نقص حاد في أكسجين الدم (${spo2}%)`;
      message = `المريض ${patientName} (${roomName}): انخفاض تشبع الأكسجين إلى (${spo2}%)، اشتباه ارتشاح رئوي أو انصمام هوائي.`;
      clinicalAction = 'وضع قناع أكسجين عالي التدفق (High Flow O2) وفحص الصدر وإيقاف الجلسة إن تطلب الأمر.';
    }

    // 4. Extreme Heart Rate
    else if (hr >= 135) {
      isUrgent = true;
      severity = 'CRITICAL';
      param = 'معدل النبض';
      val = `${hr} نبضة/دقيقة`;
      title = `إنذار حرج: تسارع حاد في نبضات القلب (${hr} bpm)`;
      message = `المريض ${patientName} (${roomName}): تسارع قلبي خطير (${hr} bpm).`;
      clinicalAction = 'توصيل شاشة رسم قلب عاجلة (ECG monitor) واستبعاد الرجفان الأذيني.';
    } else if (hr > 0 && hr <= 42) {
      isUrgent = true;
      severity = 'CRITICAL';
      param = 'معدل النبض';
      val = `${hr} نبضة/دقيقة`;
      title = `إنذار حرج: تباطؤ شديد في نبضات القلب (${hr} bpm)`;
      message = `المريض ${patientName} (${roomName}): تباطؤ حاد في النبض (${hr} bpm) مع خطر توقف القلب.`;
      clinicalAction = 'تجهيز أتروبين واستدعاء فريق الطوارئ فوراً.';
    }

    // 5. Hyperpyrexia
    else if (temp >= 38.8) {
      isUrgent = true;
      severity = 'WARNING';
      param = 'درجة الحرارة';
      val = `${temp}°C`;
      title = `تنبيه حيوي: حمى شديدة واشتباه تجرثم دم (${temp}°C)`;
      message = `المريض ${patientName} (${roomName}): ارتفاع ملحوظ في الحرارة مع رجفة محتملة أثناء الجلسة.`;
      clinicalAction = 'أخذ مزرعة دم من خط الغسيل والوريد وإعطاء خافض حرارة ومضاد حيوي حسب البروتوكول.';
    }

    if (!isUrgent) return null;

    const alert: ClinicalAlert = {
      id: `vitals_alert_${vitals.id}_${Date.now()}`,
      category: 'CRITICAL_VITALS',
      severity,
      title,
      message,
      patient_id: patientId,
      patient_name: patientName,
      patient_national_id: patient?.national_id,
      source_table: 'dialysis_vital_signs_ews',
      source_id: vitals.id,
      parameter_name: param,
      recorded_value: val,
      clinical_action: clinicalAction,
      timestamp: vitals.recorded_time || new Date().toISOString(),
      is_read: false
    };

    this.addAlert(alert);
    this.persistNotificationToDB(alert);
    return alert;
  }

  public evaluateAndTriggerSessionBPAlert(session: any): ClinicalAlert | null {
    const bpStr = String(session.blood_pressure || '').trim();
    const parts = bpStr.split('/');
    if (parts.length !== 2) return null;

    const sys = parseInt(parts[0], 10);
    const dia = parseInt(parts[1], 10);
    if (isNaN(sys)) return null;

    let isUrgent = false;
    let severity: 'CRITICAL' | 'WARNING' = 'WARNING';
    let title = '';
    let message = '';
    const patientName = session.patients?.name || 'مريض الغسيل';
    const roomName = session.room ? `غرفة ${session.room}` : '';

    if (sys >= 195 || dia >= 120) {
      isUrgent = true;
      severity = 'CRITICAL';
      title = `إنذار حرج: أزمة ضغط دم حادة بالجلسة (${bpStr})`;
      message = `المريض ${patientName} (${roomName}): تسجيل قراءة ضغط دم خطيرة ${bpStr} mmHg أثناء جلسة الغسيل.`;
    } else if (sys <= 85 || (dia > 0 && dia <= 48)) {
      isUrgent = true;
      severity = 'CRITICAL';
      title = `إنذار حرج: هبوط حاد في ضغط دم الجلسة (${bpStr})`;
      message = `المريض ${patientName} (${roomName}): هبوط مفاجئ في الضغط ${bpStr} mmHg وخطر الصدمة ونقص تروية الوصلة.`;
    }

    if (!isUrgent) return null;

    const alert: ClinicalAlert = {
      id: `session_bp_${session.id}_${Date.now()}`,
      category: 'CRITICAL_VITALS',
      severity,
      title,
      message,
      patient_id: session.patient_id,
      patient_name: patientName,
      patient_national_id: session.patients?.national_id,
      source_table: 'dialysis_sessions',
      source_id: session.id,
      parameter_name: 'ضغط الدم بالجلسة',
      recorded_value: bpStr,
      reference_range: '110/70 - 140/90 mmHg',
      clinical_action: 'مراجعة المريض على الجهاز فوراً وضبط كمية السحب وتوفير دعم طبي.',
      timestamp: new Date().toISOString(),
      is_read: false
    };

    this.addAlert(alert);
    this.persistNotificationToDB(alert);
    return alert;
  }

  // --- Alert Management ---
  private addAlert(alert: ClinicalAlert) {
    // Deduplicate by source_id or category+message within recent minutes
    const duplicate = this.alerts.some(
      a => (a.source_id && a.source_id === alert.source_id) ||
           (a.patient_name === alert.patient_name && a.title === alert.title && Math.abs(new Date(a.timestamp).getTime() - new Date(alert.timestamp).getTime()) < 180000)
    );

    if (duplicate) return;

    this.alerts = [alert, ...this.alerts];
    this.playAlertSound(alert.severity);
    this.notifyAlerts(alert);
  }

  public acknowledgeAlert(alertId: string, staffName: string = 'طبيب / تمريض الوحدة') {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.is_read = true;
      alert.acknowledged_at = new Date().toISOString();
      alert.acknowledged_by = staffName;
      this.notifyAlerts();

      // Update Supabase notification if exists
      if (alert.source_table === 'notifications' || alert.id.length > 20) {
        supabase
          .from('notifications')
          .update({
            is_read: true,
            acknowledged_at: alert.acknowledged_at,
            acknowledged_by: staffName
          })
          .eq('id', alert.id)
          .then(() => {}, () => {});
      }
    }
  }

  public dismissAlert(alertId: string) {
    this.alerts = this.alerts.filter(a => a.id !== alertId);
    this.notifyAlerts();
  }

  public clearAllAlerts() {
    this.alerts = [];
    this.notifyAlerts();
  }

  public getAlerts(): ClinicalAlert[] {
    return [...this.alerts];
  }

  public getUnreadCount(): number {
    return this.alerts.filter(a => !a.is_read).length;
  }

  public getConnectionStatus(): RealtimeConnectionStatus {
    return this.connectionStatus;
  }

  public getLastPing(): Date {
    return this.lastPingTime;
  }

  // --- Database Persistence Helper ---
  private async persistNotificationToDB(alert: ClinicalAlert) {
    try {
      await DB.addNotification({
        title: alert.title,
        message: alert.message,
        type: alert.severity === 'CRITICAL' ? 'error' : 'warning',
        category: alert.category,
        patient_id: alert.patient_id || null,
        severity: alert.severity,
        metadata: {
          patient_name: alert.patient_name,
          patient_national_id: alert.patient_national_id,
          parameter_name: alert.parameter_name,
          recorded_value: alert.recorded_value,
          reference_range: alert.reference_range,
          clinical_action: alert.clinical_action,
          source_table: alert.source_table,
          source_id: alert.source_id
        },
        is_read: false
      });
    } catch (e) {
      // Non-blocking
      console.warn('Could not persist alert to notifications table:', e);
    }
  }

  // --- Polling Heartbeat Method ---
  public async pollLatestAlerts() {
    this.lastPingTime = new Date();

    try {
      // 1. Fetch recent notifications
      const { data: recentNotifs } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (recentNotifs) {
        recentNotifs.forEach((n: any) => {
          if (n.category === 'URGENT_LAB' || n.category === 'CRITICAL_VITALS' || n.category === 'CLINICAL_ALERT') {
            const notifKey = `db_notif_${n.id}`;
            if (!this.processedSourceIds.has(notifKey)) {
              this.processedSourceIds.add(notifKey);
              this.handleNotificationChange({ new: n });
            }
          }
        });
      }

      // 2. Fetch completed lab tests from today or yesterday
      const today = new Date().toISOString().split('T')[0];
      const { data: recentLabs } = await supabase
        .from('lab_tests')
        .select('*, patients(*), lab_test_definitions(*)')
        .eq('status', 'COMPLETED')
        .gte('date', today)
        .order('id', { ascending: false })
        .limit(20);

      if (recentLabs) {
        recentLabs.forEach((lab: any) => {
          const labKey = `lab_poll_${lab.id}_${lab.result}`;
          if (!this.processedSourceIds.has(labKey)) {
            this.processedSourceIds.add(labKey);
            this.evaluateAndTriggerLabAlert(lab);
          }
        });
      }

      // 3. Fetch active sessions with vital signs
      const { data: activeSessions } = await supabase
        .from('dialysis_sessions')
        .select('*, patients(*)')
        .order('date', { ascending: false })
        .limit(15);

      if (activeSessions) {
        activeSessions.forEach((sess: any) => {
          const sessKey = `sess_poll_${sess.id}_${sess.blood_pressure}`;
          if (!this.processedSourceIds.has(sessKey)) {
            this.processedSourceIds.add(sessKey);
            this.evaluateAndTriggerSessionBPAlert(sess);
          }
        });
      }

      // 4. Check active sessions for fall risk review deadlines (every 2 hours)
      await this.checkActiveSessionsFallRisk();

      if (this.connectionStatus === 'connecting') {
        this.setStatus('polling_active');
      }
    } catch (e) {
      console.warn('Alert polling cycle error:', e);
    }
  }

  // --- Dismiss / Acknowledge Fall Risk Alert upon Nursing Review Completion ---
  public dismissFallRiskAlert(sessionId: string, stage?: string, nurseName?: string) {
    let changed = false;
    this.alerts = this.alerts.map(alert => {
      if (
        alert.category === 'FALL_RISK_CHECK' &&
        (alert.session_id === sessionId || alert.source_id?.includes(sessionId)) &&
        (!stage || alert.review_stage === stage || alert.id.includes(stage))
      ) {
        changed = true;
        return {
          ...alert,
          is_read: true,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: nurseName || 'تمريض الصالة'
        };
      }
      return alert;
    });

    if (changed) {
      this.notifyAlerts();
    }
  }

  // --- Periodic Check for Dialysis Fall Risk Procedures (Every 2 hours per session) ---
  public async checkActiveSessionsFallRisk() {
    try {
      // 1. Fetch active sessions with patient info
      const { data: activeSessions, error: sessErr } = await supabase
        .from('dialysis_sessions')
        .select('*, patients(*)')
        .eq('status', 'ACTIVE');

      if (sessErr || !activeSessions || activeSessions.length === 0) return;

      const sessionIds = activeSessions.map(s => s.id);

      // 2. Fetch all fall risk reviews recorded for these active sessions
      const { data: reviews } = await supabase
        .from('dialysis_fall_risk_reviews')
        .select('*')
        .in('session_id', sessionIds);

      const reviewsBySessionAndStage = new Map<string, boolean>();
      if (reviews) {
        reviews.forEach((r: any) => {
          reviewsBySessionAndStage.set(`${r.session_id}_${r.review_stage}`, true);
        });
      }

      const now = new Date();

      for (const session of activeSessions) {
        let elapsedMinutes = 0;
        let startDateTime: Date | null = null;

        if (session.start_time) {
          const parts = session.start_time.split(':');
          if (parts.length >= 2) {
            const dateStr = session.date || now.toISOString().split('T')[0];
            const parsed = new Date(`${dateStr}T${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`);
            if (!isNaN(parsed.getTime())) {
              startDateTime = parsed;
            }
          }
        }

        if (!startDateTime && session.created_at) {
          const parsed = new Date(session.created_at);
          if (!isNaN(parsed.getTime())) {
            startDateTime = parsed;
          }
        }

        if (startDateTime) {
          elapsedMinutes = Math.floor((now.getTime() - startDateTime.getTime()) / 60000);
        }

        if (elapsedMinutes < 0) elapsedMinutes = 0;

        const patientName = session.patients?.name || 'مريض الغسيل الكلوي';
        const roomName = session.room ? `قاعة / سرير ${session.room}` : 'الصالة العامة';
        const hoursElapsed = (elapsedMinutes / 60).toFixed(1);

        // STAGE 1: 2-Hour Review (At or after 120 minutes)
        if (elapsedMinutes >= 120) {
          const has2HourReview = reviewsBySessionAndStage.get(`${session.id}_2_HOURS`);
          const alertKey = `fall_risk_${session.id}_2_HOURS`;

          if (!has2HourReview && !this.processedSourceIds.has(alertKey)) {
            const alreadyExists = this.alerts.some(
              a => a.category === 'FALL_RISK_CHECK' && a.session_id === session.id && a.review_stage === '2_HOURS' && !a.is_read
            );

            if (!alreadyExists) {
              const isCrit = elapsedMinutes >= 150;
              const alert: ClinicalAlert = {
                id: `fall_alert_2h_${session.id}_${Date.now()}`,
                category: 'FALL_RISK_CHECK',
                severity: isCrit ? 'CRITICAL' : 'WARNING',
                title: isCrit
                  ? `إنذار متأخر: مراجعة إجراءات السقوط (تجاوزت ${hoursElapsed} ساعة)`
                  : `تنبيه تمريض الصالة: حان موعد المراجعة الأولى لمخاطر السقوط (ساعتان)`,
                message: `مرت ${hoursElapsed} ساعة على بدء جلسة المريض ${patientName} (${roomName}). يرجى مراجعة وتوثيق إجراءات أمان السرير والفرامل والحواجز فوراً.`,
                patient_id: session.patient_id,
                patient_name: patientName,
                patient_national_id: session.patients?.national_id,
                session_id: session.id,
                review_stage: '2_HOURS',
                source_table: 'dialysis_sessions',
                source_id: alertKey,
                parameter_name: 'مراجعة الساعتين لمخاطر السقوط',
                recorded_value: `${elapsedMinutes} دقيقة بالجلسة`,
                reference_range: 'مراجعة كل ساعتين (مرتان بالجلسة)',
                clinical_action: 'التأكد من خفض السرير، قفل الفرامل، رفع الحواجز الجانبية، وقرب جرس الاستدعاء ومنع القيام منفرداً.',
                timestamp: now.toISOString(),
                is_read: false
              };

              this.processedSourceIds.add(alertKey);
              this.addAlert(alert);
              this.persistNotificationToDB(alert);
            }
          }
        }

        // STAGE 2: 4-Hour / Pre-Termination Review (At or after 240 minutes)
        if (elapsedMinutes >= 240) {
          const has4HourReview = reviewsBySessionAndStage.get(`${session.id}_4_HOURS`);
          const alertKey = `fall_risk_${session.id}_4_HOURS`;

          if (!has4HourReview && !this.processedSourceIds.has(alertKey)) {
            const alreadyExists = this.alerts.some(
              a => a.category === 'FALL_RISK_CHECK' && a.session_id === session.id && a.review_stage === '4_HOURS' && !a.is_read
            );

            if (!alreadyExists) {
              const alert: ClinicalAlert = {
                id: `fall_alert_4h_${session.id}_${Date.now()}`,
                category: 'FALL_RISK_CHECK',
                severity: 'CRITICAL',
                title: `تنبيه تمريض الصالة: المراجعة الثانية لمخاطر السقوط (4 ساعات / نهاية الجلسة)`,
                message: `وصلت جلسة المريض ${patientName} (${roomName}) إلى ${hoursElapsed} ساعة. يجب إجراء المراجعة الثانية وتأمين المريض قبل فصل الجلسة والحركة.`,
                patient_id: session.patient_id,
                patient_name: patientName,
                patient_national_id: session.patients?.national_id,
                session_id: session.id,
                review_stage: '4_HOURS',
                source_table: 'dialysis_sessions',
                source_id: alertKey,
                parameter_name: 'مراجعة 4 ساعات لمخاطر السقوط',
                recorded_value: `${elapsedMinutes} دقيقة بالجلسة`,
                reference_range: 'المراجعة الثانية قبل إنهاء الجلسة',
                clinical_action: 'تقييم اتزان المريض بعد السحب، قياس ضغط الدم، وتوفير مرافقة تمريضية مباشرة عند المغادرة.',
                timestamp: now.toISOString(),
                is_read: false
              };

              this.processedSourceIds.add(alertKey);
              this.addAlert(alert);
              this.persistNotificationToDB(alert);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error evaluating active sessions fall risk checks:', err);
    }
  }

  // --- Manual Test Alert Trigger (For quick demonstration and testing) ---
  public simulateTestAlert(type: 'urgent_lab' | 'critical_vitals' | 'fall_risk_check' = 'urgent_lab') {
    if (type === 'urgent_lab') {
      const sampleAlert: ClinicalAlert = {
        id: `test_lab_${Date.now()}`,
        category: 'URGENT_LAB',
        severity: 'CRITICAL',
        title: 'إنذار عاجل: نتيجة تحليل حرجة - بوتاسيوم (K+) مرتفع جداً 6.9 mEq/L',
        message: 'مريض وحدة الغسيل: أظهرت نتائج فحص الكهارل الفوري ارتفاعاً حرجاً في البوتاسيوم (6.9 mEq/L) مع مخاطر اضطراب النظم القلبي.',
        patient_name: 'الحاج إبراهيم حسن متولي',
        patient_national_id: '26508151203491',
        source_table: 'lab_tests',
        source_id: `test_lab_${Date.now()}`,
        parameter_name: 'Serum Potassium (K+)',
        recorded_value: '6.9 mEq/L',
        reference_range: '3.5 - 5.1 mEq/L',
        clinical_action: 'إجراء رسم قلب ECG فوراً، إعطاء كالسيوم جلوكونات والبدء العاجل في غسيل دموي طارئ.',
        timestamp: new Date().toISOString(),
        is_read: false
      };
      this.addAlert(sampleAlert);
      this.persistNotificationToDB(sampleAlert);
    } else if (type === 'fall_risk_check') {
      const sampleAlert: ClinicalAlert = {
        id: `test_fall_${Date.now()}`,
        category: 'FALL_RISK_CHECK',
        severity: 'WARNING',
        title: 'تنبيه تمريض الصالة: حان موعد المراجعة الأولى لمخاطر السقوط (ساعتان)',
        message: 'مرت ساعتان على بدء جلسة المريض: الحاج محمود إبراهيم (قاعة 1 / سرير 3). يجب على طاقم التمريض بالصالة مراجعة وتأمين إجراءات الأمان وتثبيت الفرامل والحواجز.',
        patient_name: 'الحاج محمود إبراهيم عبد الرحمن',
        patient_national_id: '25807121401293',
        source_table: 'dialysis_sessions',
        source_id: `test_fall_${Date.now()}`,
        review_stage: '2_HOURS',
        parameter_name: 'مراجعة دورية لإجراءات الوقاية من السقوط',
        recorded_value: '120 دقيقة بالجلسة (منتصف الجلسة)',
        reference_range: 'مراجعة كل ساعتين (مرتان بالجلسة)',
        clinical_action: 'مراجعة خفض السرير وفرامل الكرسي، الحواجز الجانبية، وجرس الاستدعاء والتنبيه الصارم بعدم الوقوف دون مساعدة التمريض.',
        timestamp: new Date().toISOString(),
        is_read: false
      };
      this.addAlert(sampleAlert);
      this.persistNotificationToDB(sampleAlert);
    } else {
      const sampleAlert: ClinicalAlert = {
        id: `test_vitals_${Date.now()}`,
        category: 'CRITICAL_VITALS',
        severity: 'CRITICAL',
        title: 'إنذار حرج: هبوط حاد في ضغط دم الجلسة وتدهور EWS (Score 8)',
        message: 'المريض في الغرفة 2: انخفاض مفاجئ لضغط الدم إلى 82/45 mmHg مع تسارع النبض 132 bpm وتشبع أكسجين 87% على الجهاز.',
        patient_name: 'فاطمة محمود الشناوي',
        patient_national_id: '27211041604582',
        source_table: 'dialysis_vital_signs_ews',
        source_id: `test_vitals_${Date.now()}`,
        parameter_name: 'ضغط الدم وتشبع الأكسجين',
        recorded_value: '82/45 mmHg | SpO2 87%',
        reference_range: '120/80 mmHg | SpO2 >= 95%',
        clinical_action: 'إيقاف السحب الفائق (UF=0)، وضعية ترندلينبورغ، ضخ محلول ملحي 250 مل، وفتح ماسك أكسجين فوراً.',
        timestamp: new Date().toISOString(),
        is_read: false
      };
      this.addAlert(sampleAlert);
      this.persistNotificationToDB(sampleAlert);
    }
  }
}

export const realtimeNotificationService = new RealtimeNotificationService();
