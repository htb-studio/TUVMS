-- إضافة حقل withdrawn لتتبع الانسحابات ومنع إعادة التسجيل
ALTER TABLE public.registrations 
ADD COLUMN IF NOT EXISTS withdrawn BOOLEAN DEFAULT FALSE;

-- تعليق بالعربية
COMMENT ON COLUMN public.registrations.withdrawn IS 'هل انسحب المتطوع من الفعالية؟ - يُستخدم لمنع إعادة التسجيل بعد الانسحاب';
