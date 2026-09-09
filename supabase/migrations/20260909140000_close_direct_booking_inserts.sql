-- Gate 3C: force public booking creation through public.create_booking(...)
--
-- Apply only after Gate 3B is deployed and a browser booking has been
-- verified through public.create_booking(...).

REVOKE INSERT ON TABLE public.bookings FROM anon, authenticated;

DROP POLICY IF EXISTS "Anyone can create booking" ON public.bookings;

COMMENT ON TABLE public.bookings IS
'Bookings are created through public.create_booking(...); direct anon/authenticated INSERT is intentionally disabled.';
