-- جدول سجلات السلوك التطوعي
-- يُستخدم لتسجيل تقييمات السلوك والملاحظات من قبل الإدارة والمنظمين

CREATE TABLE IF NOT EXISTS public.volunteer_behavior_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  evaluator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- تقييم السلوك (إيجابي/سلبي)
  behavior_type VARCHAR(20) NOT NULL CHECK (behavior_type IN ('positive', 'negative', 'neutral')),
  
  -- تفاصيل التقييم
  behavior_category VARCHAR(50) CHECK (behavior_category IN (
    'professional_appearance',  -- مظهر احترافي
    'elegant_style',            -- أسلوب راقي
    'late_arrival',             -- تأخر
    'public_conduct_violation', -- مخالفة الذوق العام
    'excellent_participation',  -- مشاركة ممتازة
    'leadership',               -- قيادة
    'teamwork',                 -- عمل جماعي
    'other'                     -- أخرى
  )),
  
  -- ملاحظات الإدارة
  admin_notes TEXT,
  
  -- نقاط التأثير (إيجابية أو سلبية)
  points_impact INTEGER DEFAULT 0,
  
  -- الحالة
  is_active BOOLEAN DEFAULT true,
  
  -- الطوابع الزمنية
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_volunteer_behavior_logs_user_id ON public.volunteer_behavior_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_behavior_logs_event_id ON public.volunteer_behavior_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_behavior_logs_evaluator_id ON public.volunteer_behavior_logs(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_behavior_logs_created_at ON public.volunteer_behavior_logs(created_at DESC);

-- إنشاء Row Level Security (RLS)
ALTER TABLE public.volunteer_behavior_logs ENABLE ROW LEVEL SECURITY;

-- السياسات:
-- الإدارة والمنظمون يمكنهم قراءة جميع السجلات
CREATE POLICY "Admins and organizers can view all behavior logs"
  ON public.volunteer_behavior_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'organizer')
    )
  );

-- المستخدم يمكنه رؤية سجلاته الخاصة فقط
CREATE POLICY "Users can view their own behavior logs"
  ON public.volunteer_behavior_logs FOR SELECT
  USING (user_id = auth.uid());

-- الإدارة والمنظمون يمكنهم إضافة سجلات جديدة
CREATE POLICY "Admins and organizers can insert behavior logs"
  ON public.volunteer_behavior_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'organizer')
    )
  );

-- الإدارة والمنظمون يمكنهم تحديث السجلات
CREATE POLICY "Admins and organizers can update behavior logs"
  ON public.volunteer_behavior_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'organizer')
    )
  );

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_volunteer_behavior_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء التريجر
CREATE TRIGGER trigger_update_volunteer_behavior_logs_updated_at
  BEFORE UPDATE ON public.volunteer_behavior_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_volunteer_behavior_logs_updated_at();

-- تعليق بالعربية
COMMENT ON TABLE public.volunteer_behavior_logs IS 'جدول سجلات السلوك التطوعي - يسجل تقييمات السلوك والملاحظات من قبل الإدارة والمنظمين';
COMMENT ON COLUMN public.volunteer_behavior_logs.behavior_type IS 'نوع التقييم: إيجابي، سلبي، أو محايد';
COMMENT ON COLUMN public.volunteer_behavior_logs.behavior_category IS 'فئة التقييم: مظهر احترافي، أسلوب راقي، تأخر، مخالفة الذوق العام، إلخ';
COMMENT ON COLUMN public.volunteer_behavior_logs.admin_notes IS 'ملاحظات الإدارة على سلوك المتطوع';
COMMENT ON COLUMN public.volunteer_behavior_logs.points_impact IS 'تأثير النقاط (إيجابي أو سلبي) على رصيد المتطوع';
