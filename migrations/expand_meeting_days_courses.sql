-- Expand meeting_days to 3-letter abbreviations with ", " separator.
-- M=Mon, T=Tue, W=Wed, R=Thu, F=Fri
-- e.g. "TR" -> "Tue, Thu", "MWF" -> "Mon, Wed, Fri"
-- Only updates rows where meeting_days is purely M,T,W,R,F (one or more letters).

UPDATE public.courses
SET meeting_days = TRIM(BOTH ', ' FROM (
  CASE WHEN meeting_days ~ 'M' THEN 'Mon, ' ELSE '' END ||
  CASE WHEN meeting_days ~ 'T' THEN 'Tue, ' ELSE '' END ||
  CASE WHEN meeting_days ~ 'W' THEN 'Wed, ' ELSE '' END ||
  CASE WHEN meeting_days ~ 'R' THEN 'Thu, ' ELSE '' END ||
  CASE WHEN meeting_days ~ 'F' THEN 'Fri, ' ELSE '' END
))
WHERE meeting_days ~ '^[MTWRF]+$';
