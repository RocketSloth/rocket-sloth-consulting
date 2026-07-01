-- Seed data for VettedPages directory.
-- Safe to re-run. Seed reviews use a NULL author_id (real reviews always set one),
-- so they are cleared and re-inserted on each run.
--
-- To make yourself an admin after signing up:
--   update public.profiles set role = 'admin' where email = 'you@example.com';

-- ---------- categories ----------
insert into public.categories (slug, name, description, icon, sort_order) values
  ('plumbing','Plumbing','Pipes, leaks, water heaters, fixtures.','🔧',1),
  ('electrical','Electrical','Wiring, panels, lighting, outlets.','⚡',2),
  ('hvac','Heating & Cooling','Furnaces, AC, heat pumps, ventilation.','🌡️',3),
  ('roofing','Roofing','Repairs, replacement, gutters.','🏠',4),
  ('landscaping','Landscaping & Lawn','Lawn care, design, irrigation.','🌿',5),
  ('cleaning','House Cleaning','Recurring, deep, and move-out cleans.','🧽',6),
  ('painting','Painting','Interior and exterior painting.','🎨',7),
  ('general-contracting','General Contracting','Remodels and large projects.','🏗️',8),
  ('flooring','Flooring','Hardwood, tile, carpet, vinyl.','🪵',9),
  ('pest-control','Pest Control','Inspection and extermination.','🐜',10),
  ('handyman','Handyman','Small repairs and odd jobs.','🛠️',11),
  ('appliance-repair','Appliance Repair','Washers, dryers, fridges, ovens.','🧰',12)
on conflict (slug) do nothing;

-- ---------- companies ----------
insert into public.companies
  (slug, name, description, phone, email, website, city, state, zip, service_area,
   license_number, years_in_business, status, verified_at)
values
  ('cascade-plumbing','Cascade Plumbing Co.',
   'Licensed, family-owned plumbers serving the greater Portland metro. Repairs, repipes, and water heater installs with upfront pricing.',
   '(503) 555-0142','hello@cascadeplumbing.example','https://cascadeplumbing.example',
   'Portland','OR','97214','Portland metro & inner suburbs','OR-PLM-48213',14,'approved', now()),
  ('evergreen-electric','Evergreen Electric',
   'Whole-home rewiring, panel upgrades, EV chargers, and lighting. Background-checked electricians and clean, on-time work.',
   '(206) 555-0198','team@evergreenelectric.example','https://evergreenelectric.example',
   'Seattle','WA','98103','Seattle & Eastside','WA-ELC-77120',9,'approved', now()),
  ('rainier-roofing','Rainier Roofing',
   'Storm-ready roof replacement and repair built for Pacific Northwest weather. Free inspections and 25-year workmanship warranty.',
   '(253) 555-0167','office@rainierroofing.example','https://rainierroofing.example',
   'Tacoma','WA','98402','Pierce & South King County','WA-ROO-30551',18,'approved', now()),
  ('nw-comfort-hvac','Northwest Comfort Heating & Cooling',
   'Heat pump specialists. Efficient installs, honest maintenance plans, and 24/7 emergency service across Central Oregon.',
   '(541) 555-0123','service@nwcomfort.example','https://nwcomfort.example',
   'Bend','OR','97701','Bend, Redmond & Sisters','OR-HVA-19884',11,'approved', now()),
  ('willamette-landscaping','Willamette Landscaping',
   'Design-build landscaping, irrigation, and seasonal lawn care. Native, low-water designs that thrive in the valley.',
   '(541) 555-0156','grow@willamettelandscaping.example','https://willamettelandscaping.example',
   'Eugene','OR','97401','Eugene–Springfield','OR-LND-65002',7,'approved', now()),
  ('summit-remodeling','Summit Home Remodeling',
   'Kitchen and bath remodels and whole-home renovations. Transparent budgets, dedicated project managers, and tidy job sites.',
   '(360) 555-0179','build@summitremodel.example','https://summitremodel.example',
   'Vancouver','WA','98660','Clark County & Portland metro','WA-GCN-44190',16,'approved', now())
on conflict (slug) do nothing;

-- ---------- company ↔ category links ----------
insert into public.company_categories (company_id, category_id)
select c.id, cat.id
from (values
  ('cascade-plumbing','plumbing'),
  ('cascade-plumbing','handyman'),
  ('evergreen-electric','electrical'),
  ('rainier-roofing','roofing'),
  ('nw-comfort-hvac','hvac'),
  ('willamette-landscaping','landscaping'),
  ('summit-remodeling','general-contracting'),
  ('summit-remodeling','flooring')
) as link(company_slug, category_slug)
join public.companies c on c.slug = link.company_slug
join public.categories cat on cat.slug = link.category_slug
on conflict do nothing;

-- ---------- reviews (seed = NULL author_id) ----------
delete from public.reviews where author_id is null;

insert into public.reviews
  (company_id, author_name, rating, title, body, job_type, job_cost, job_completed_on, status, verified_at)
select c.id, r.author_name, r.rating, r.title, r.body, r.job_type, r.job_cost,
       r.job_completed_on, 'published', now()
from (values
  ('cascade-plumbing','Jamie R.',5,'Fixed a slab leak fast',
   'They found and fixed a hidden slab leak the same day. Clear quote before any work, no surprises on the invoice.','Leak repair',850.00, date '2026-04-12'),
  ('cascade-plumbing','Dana P.',5,'New water heater, great crew',
   'Swapped our failing water heater for a tankless unit. Clean install and they hauled the old one away.','Water heater install',3200.00, date '2026-03-02'),
  ('evergreen-electric','Marcus T.',5,'Panel upgrade done right',
   'Upgraded us to 200A and added an EV charger. Inspector passed it first try. Tidy and professional.','Panel upgrade',2750.00, date '2026-05-09'),
  ('evergreen-electric','Priya S.',4,'Solid lighting work',
   'Recessed lighting throughout the main floor. Looks fantastic; only knocked a star for a small scheduling delay.','Lighting',1900.00, date '2026-02-20'),
  ('rainier-roofing','Chris L.',5,'Survived the first storm',
   'Full tear-off and replacement. Crew was meticulous about cleanup and the new roof handled a brutal windstorm with zero issues.','Roof replacement',14800.00, date '2026-01-28'),
  ('rainier-roofing','Bev M.',5,'Honest inspection',
   'They could have sold me a new roof but said I only needed a repair. Saved me thousands. That earns my trust.','Roof repair',640.00, date '2026-04-30'),
  ('nw-comfort-hvac','Alex K.',5,'Heat pump pros',
   'Replaced an ancient furnace with a heat pump. Our winter bills dropped noticeably and the house is finally even temperature.','Heat pump install',9100.00, date '2026-03-18'),
  ('nw-comfort-hvac','Sam D.',4,'Reliable maintenance',
   'Signed up for their maintenance plan. Techs are punctual and explain everything. Would like a bit more online scheduling.','Maintenance',180.00, date '2026-05-22'),
  ('willamette-landscaping','Renee A.',5,'Transformed our yard',
   'Native, low-water design that looks incredible and barely needs watering. The irrigation zoning is smart.','Landscape design',6400.00, date '2026-04-05'),
  ('summit-remodeling','Tom H.',5,'Kitchen of our dreams',
   'Full kitchen remodel on time and on budget. The project manager kept us updated weekly and the site was spotless each day.','Kitchen remodel',38500.00, date '2026-02-14'),
  ('summit-remodeling','Gabriela V.',4,'Great bath remodel',
   'Beautiful primary bath. One small fixture backorder pushed the finish date, but communication stayed excellent throughout.','Bathroom remodel',21000.00, date '2026-05-01')
) as r(company_slug, author_name, rating, title, body, job_type, job_cost, job_completed_on)
join public.companies c on c.slug = r.company_slug;

-- ========================================================================
-- Frisco, TX-area demo companies
-- ========================================================================
insert into public.companies
  (slug, name, description, phone, email, website, city, state, zip, service_area, license_number, years_in_business, status, verified_at)
values
  ('lone-star-plumbing','Lone Star Plumbing Co.','Frisco-based licensed plumbers. Drain cleaning, slab leaks, tankless water heaters, and repipes with upfront flat-rate pricing.','(469) 555-0110','office@lonestarplumbing.example','https://lonestarplumbing.example','Frisco','TX','75034','Frisco, Plano, Little Elm & The Colony','TX-MPL-43210',12,'approved', now()),
  ('frisco-electric-pros','Frisco Electric Pros','Panel upgrades, EV chargers, recessed lighting, and surge protection. Master electricians, clean installs, and same-week scheduling.','(972) 555-0124','team@friscoelectricpros.example','https://friscoelectricpros.example','Frisco','TX','75035','Frisco & North Collin County','TECL-78452',8,'approved', now()),
  ('north-texas-cool-air','North Texas Cool Air','AC and heat-pump specialists for the Texas heat. Efficient installs, honest maintenance plans, and 24/7 emergency service.','(214) 555-0188','service@ntxcoolair.example','https://ntxcoolair.example','Plano','TX','75024','Plano, Frisco, Allen & Richardson','TACLB-92110',15,'approved', now()),
  ('lone-peak-roofing','Lone Peak Roofing','Storm and hail roof replacement and repair built for North Texas weather. Free inspections and insurance-claim help.','(469) 555-0166','hello@lonepeakroofing.example','https://lonepeakroofing.example','McKinney','TX','75070','Collin County & North Dallas','RCAT-CC-5521',19,'approved', now()),
  ('prairie-green-landscaping','Prairie Green Landscaping','Design-build landscaping, sod, irrigation, and drought-smart Texas natives that thrive in the heat.','(972) 555-0143','grow@prairiegreen.example','https://prairiegreen.example','Frisco','TX','75033','Frisco, Prosper & Celina','TX-IRR-66104',6,'approved', now()),
  ('bluebonnet-remodeling','Bluebonnet Home Remodeling','Kitchen and bath remodels and whole-home renovations. Transparent budgets, dedicated project managers, and tidy job sites.','(214) 555-0179','build@bluebonnetremodel.example','https://bluebonnetremodel.example','Allen','TX','75013','Allen, Frisco, McKinney & Plano','TX-GC-44190',14,'approved', now()),
  ('legacy-handyman-frisco','Legacy Handyman Services','Trusted handyman for the honey-do list: drywall, TV mounts, fixtures, fence repair, and more. One call, done right.','(469) 555-0151','jobs@legacyhandyman.example','https://legacyhandyman.example','Frisco','TX','75036','Frisco & surrounding suburbs','TX-HMN-20887',9,'approved', now()),
  ('spotless-maids-dfw','Spotless Maids DFW','Recurring, deep, and move-out house cleaning. Background-checked, insured cleaners and a 100% satisfaction guarantee.','(972) 555-0137','book@spotlessmaidsdfw.example','https://spotlessmaidsdfw.example','Plano','TX','75025','Plano, Frisco & Allen','TX-CLN-31556',5,'approved', now())
on conflict (slug) do nothing;

insert into public.company_categories (company_id, category_id)
select c.id, cat.id
from (values
  ('lone-star-plumbing','plumbing'),
  ('lone-star-plumbing','handyman'),
  ('frisco-electric-pros','electrical'),
  ('north-texas-cool-air','hvac'),
  ('lone-peak-roofing','roofing'),
  ('prairie-green-landscaping','landscaping'),
  ('bluebonnet-remodeling','general-contracting'),
  ('bluebonnet-remodeling','flooring'),
  ('legacy-handyman-frisco','handyman'),
  ('spotless-maids-dfw','cleaning')
) as link(company_slug, category_slug)
join public.companies c on c.slug = link.company_slug
join public.categories cat on cat.slug = link.category_slug
on conflict do nothing;

insert into public.reviews
  (company_id, author_name, rating, title, body, job_type, job_cost, job_completed_on, status, verified_at)
select c.id, r.author_name, r.rating, r.title, r.body, r.job_type, r.job_cost, r.job_completed_on, 'published', now()
from (values
  ('lone-star-plumbing','Marcus B.',5,'Tankless install done right','Replaced our old tank with a tankless unit. On time, fair flat-rate quote, and they walked me through the new system.','Water heater install',3400.00, date '2026-05-14'),
  ('lone-star-plumbing','Hannah W.',5,'Found the slab leak fast','Pinpointed a slab leak the same morning and had it fixed by afternoon. No upselling.','Leak repair',920.00, date '2026-04-03'),
  ('frisco-electric-pros','Dev P.',5,'EV charger + panel upgrade','Installed a 240V charger and upgraded the panel to 200A. Passed inspection first try. Spotless work.','EV charger',2600.00, date '2026-05-20'),
  ('frisco-electric-pros','Lauren M.',4,'Great recessed lighting','Whole first floor recessed lighting. Looks fantastic; lost a star for a slight scheduling shuffle.','Lighting',1750.00, date '2026-03-11'),
  ('north-texas-cool-air','Raj S.',5,'Beat the Texas summer','New high-efficiency AC before the heat hit. Cooling bills dropped and the house is finally even.','AC install',7800.00, date '2026-05-02'),
  ('north-texas-cool-air','Carla J.',4,'Solid maintenance plan','Twice-a-year tune-ups. Techs are punctual and explain everything. Wish online booking was easier.','Maintenance',160.00, date '2026-04-22'),
  ('lone-peak-roofing','Greg T.',5,'Hail claim handled','Full replacement after a hailstorm. They handled the insurance paperwork and the crew was meticulous on cleanup.','Roof replacement',16200.00, date '2026-04-18'),
  ('prairie-green-landscaping','Nina A.',5,'Beautiful drought-smart yard','Native, low-water design that looks incredible and barely needs watering. The irrigation zoning is smart.','Landscape design',5400.00, date '2026-05-09'),
  ('bluebonnet-remodeling','Tom and Edie R.',5,'Dream kitchen, on budget','Full kitchen remodel finished on schedule. Weekly updates and a spotless site every day.','Kitchen remodel',41000.00, date '2026-03-28'),
  ('legacy-handyman-frisco','Priscilla K.',5,'Knocked out the whole list','Mounted three TVs, fixed a fence gate, and patched drywall in one visit. Friendly and fast.','Handyman',480.00, date '2026-05-25'),
  ('spotless-maids-dfw','Brian H.',5,'Move-out clean saved our deposit','Deep move-out clean that got us our full deposit back. Thorough and on time.','Move-out clean',290.00, date '2026-05-30')
) as r(company_slug, author_name, rating, title, body, job_type, job_cost, job_completed_on)
join public.companies c on c.slug = r.company_slug;
