-- جدول سجلات السلوك التطوعي (مطابق للمخطط الأصلي)
-- يُستخدم لتسجيل تقييمات السلوك والملاحظات من قبل الإدارة والمنظمين

CREATE TABLE IF NOT EXISTS public.volunteer_behavior_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  evaluation_type VARCHAR(20) NOT NULL CHECK (evaluation_type IN ('Positive', 'Negative')),
  reason_tag VARCHAR(50) NOT NULL,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_volunteer_behavior_logs_volunteer_id ON public.volunteer_behavior_logs(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_behavior_logs_event_id ON public.volunteer_behavior_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_behavior_logs_admin_id ON public.volunteer_behavior_logs(admin_id);
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
  USING (volunteer_id = auth.uid());

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

-- تعليق بالعربية
COMMENT ON TABLE public.volunteer_behavior_logs IS 'جدول سجلات السلوك التطوعي - يسجل تقييمات السلوك والملاحظات من قبل الإدارة والمنظمين';
COMMENT ON COLUMN public.volunteer_behavior_logs.evaluation_type IS 'نوع التقييم: Positive (إيجابي) أو Negative (سلبي)';
COMMENT ON COLUMN public.volunteer_behavior_logs.reason_tag IS 'سبب التقييم: مظهر احترافي، أسلوب راقي، تأخر، مخالفة الذوق العام، إلخ';
COMMENT ON COLUMN public.volunteer_behavior_logs.admin_notes IS 'ملاحظات الإدارة على سلوك المتطوع';
