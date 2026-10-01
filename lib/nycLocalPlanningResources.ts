export interface NycLocalPlanningResource {
  heading: string
  body: string
  label: string
  url: string
  checked: string
}

// A city/service-area page becomes indexable only when it has a verified official
// local planning resource here. Areas without one stay noindex and out of sitemap.
export const NYC_LOCAL_PLANNING: Record<string, NycLocalPlanningResource> = {
  riverdale: {
    heading: 'Planning an event near Van Cortlandt Park',
    body: 'Van Cortlandt Park sits directly beside Riverdale, and NYC Parks lists ZIP codes 10463 and 10471 among the park areas plus a dedicated Special Events Permits contact. If your Riverdale event uses NYC Parks property, confirm the permitted site, delivery access and setup rules before finalizing the tent footprint or powered equipment.',
    label: 'NYC Parks — Van Cortlandt Park',
    url: 'https://nycgovparks.org/parks/VanCortlandtPark',
    checked: 'October 1, 2026',
  },
  fieldston: {
    heading: 'NYC Parks permit planning for Fieldston-area events',
    body: 'Fieldston events that use NYC parkland can involve more than a basic space reservation. NYC Parks explains that food service, amplified sound and generators can trigger additional health, NYPD or FDNY requirements. Review those rules before locking in concessions, sound equipment, power or a large outdoor layout.',
    label: 'NYC Parks — Special Event Permit Guide',
    url: 'https://nycgovparks.org/permits/special-events/guide',
    checked: 'October 1, 2026',
  },
  kingsbridge: {
    heading: 'Bronx permit office for Kingsbridge-area park events',
    body: 'For Kingsbridge events on NYC Parks property, the Bronx borough permit office is the local point of contact for special-event permitting. Confirm the park site and event requirements before planning delivery routes, staking space, generators or other equipment that may need agency approval.',
    label: 'NYC Parks — Bronx Special Event Permit Office',
    url: 'https://nycgovparks.org/permits/special-events/contacts',
    checked: 'October 1, 2026',
  },
  bronx: {
    heading: 'Bronx park-event permit checklist',
    body: 'NYC Parks special-event rules cover reserved group activities and require organizers to identify the event site, timing and equipment needs. The official application materials also call out vehicle access and electrical requirements, which can affect rental delivery, generator planning and setup logistics for Bronx events on park property.',
    label: 'NYC Parks — Special Event Application',
    url: 'https://www.nycgovparks.org/sub_permits_and_applications/images_and_pdfs/event_application_form.pdf',
    checked: 'October 1, 2026',
  },
  yonkers: {
    heading: 'Yonkers special-event permit planning',
    body: 'Yonkers Parks maintains a dedicated Special Event Permit process for events using City facilities or spaces. The City advises organizers to complete the application and coordinate with its Special Events Division; use that process before committing delivery windows, public-space layouts or equipment that depends on municipal approval.',
    label: 'City of Yonkers — Special Event Permits',
    url: 'https://www.yonkersny.gov/437/Special-Event-Permits',
    checked: 'October 1, 2026',
  },
  'mount-vernon': {
    heading: 'Mount Vernon block-party and special-event applications',
    body: 'Mount Vernon directs block-party and special-event applicants through its official online application process. If your event uses a street, public space or other City-controlled area, confirm approval and access conditions before scheduling delivery, placement or pickup of rental equipment.',
    label: 'City of Mount Vernon — Block Parties / Special Events',
    url: 'https://www.mountvernonny.gov/394/Block-Parties-Special-Events',
    checked: 'October 1, 2026',
  },
  'new-rochelle': {
    heading: 'Planning around New Rochelle park spaces',
    body: 'New Rochelle identifies Hudson Park and Beach as a major public recreation and event area with a bandshell, grassy recreation space and seasonal community events. For any rental setup at a City park or public venue, confirm the exact permitted area, delivery access and event rules with the City or venue before finalizing your layout.',
    label: 'City of New Rochelle — Hudson Park Planning',
    url: 'https://www.newrochelleny.com/hudsonparkplan',
    checked: 'October 1, 2026',
  },
  bronxville: {
    heading: 'Bronxville special-event logistics',
    body: 'Bronxville requires a Special Event Application for organized activities that affect public property, rights-of-way or Village services. The official form specifically asks organizers to identify tents, staging, tables, portable generators and other structures, making it a useful checklist before finalizing rental quantities and setup plans.',
    label: 'Village of Bronxville — Special Event Application',
    url: 'https://www.villageofbronxville.gov/FormCenter/Police-7/Special-Event-Application-Form-55',
    checked: 'October 1, 2026',
  },
  pelham: {
    heading: 'Pelham special-event approval and insurance',
    body: 'Pelham requires an application for special events using Village property. The Village states that applications must be filed 14 to 60 days before the event and that events on Village property require insurance and an indemnification agreement, so confirm those requirements before committing to a public-space rental setup.',
    label: 'Village of Pelham — Special Event Request',
    url: 'https://www.pelhamny.gov/239/Application-for-Special-Event-Request',
    checked: 'October 1, 2026',
  },
}
