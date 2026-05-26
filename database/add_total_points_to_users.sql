-- إضافة حقل total_points إلى جدول users
-- يُستخدم لتتبع نقاط المتطوع وحساب مستواه (Level)

-- إضافة الحقل إذا لم يكن موجوداً
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;

-- إضافة حقل مستوى المتطوب (Level 1-10)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- إضافة حقل إجمالي الساعات التطوعية
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS total_hours INTEGER DEFAULT 0;

-- إنشاء دالة لحساب المستوى بناءً على النقاط
CREATE OR REPLACE FUNCTION calculate_user_level(points INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- المستويات من 1 إلى 10
  -- كل مستوى يتطلب نقاط معينة
  -- المستوى 1: 0-9 نقاط
  -- المستوى 2: 10-19 نقطة
  -- المستوى 3: 20-29 نقطة
  -- المستوى 4: 30-39 نقطة
  -- المستوى 5: 40-49 نقطة
  -- المستوى 6: 50-59 نقطة
  -- المستوى 7: 60-69 نقطة
  -- المستوى 8: 70-79 نقطة
  -- المستوى 9: 80-89 نقطة
  -- المستوى 10: 90+ نقطة
  
  IF points < 10 THEN
    RETURN 1;
  ELSIF points < 20 THEN
    RETURN 2;
  ELSIF points < 30 THEN
    RETURN 3;
  ELSIF points < 40 THEN
    RETURN 4;
  ELSIF points < 50 THEN
    RETURN 5;
  ELSIF points < 60 THEN
    RETURN 6;
  ELSIF points < 70 THEN
    RETURN 7;
  ELSIF points < 80 THEN
    RETURN 8;
  ELSIF points < 90 THEN
    RETURN 9;
  ELSE
    RETURN 10;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- إنشاء تريجر لتحديث المستوى تلقائياً عند تغيير النقاط
CREATE OR REPLACE FUNCTION update_user_level_on_points_change()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level = calculate_user_level(NEW.total_points);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء التريجر
DROP TRIGGER IF EXISTS trigger_update_user_level ON public.users;
CREATE TRIGGER trigger_update_user_level
  BEFORE UPDATE OF total_points ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_level_on_points_change();

-- تحديث المستويات الحالية لجميع المستخدمين
UPDATE public.users 
SET level = calculate_user_level(total_points);

-- تعليقات بالعربية
COMMENT ON COLUMN public.users.total_points IS 'إجمالي نقاط المتطوب (تُستخدم لحساب المستوى)';
COMMENT ON COLUMN public.users.level IS 'مستوى المتطوب (1-10) يُحسب تلقائياً بناءً على النقاط';
COMMENT ON COLUMN public.users.total_hours IS 'إجمالي الساعات التطوعية المكتملة';
