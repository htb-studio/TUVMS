-- إضافة حقل حالة التسجيل إلى جدول events
-- يُستخدم للتحكم في فتح/إغلاق التسجيل للفعاليات

-- إضافة الحقل إذا لم يكن موجوداً
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS registration_status VARCHAR(20) DEFAULT 'open' CHECK (registration_status IN ('open', 'closed'));

-- تعليق بالعربية
COMMENT ON COLUMN public.events.registration_status IS 'حالة التسجيل: open (مفتوح) أو closed (مغلق) - يمكن التحكم بها من لوحة الإدارة';
