# Clinic record

A web app for the doctors of one small clinic in Egypt. They use it to keep real patient records, write each visit, and reserve appointments. V1 is that record, those visits, and those appointments.

There is no national ID field.

## Who uses it

Doctors use the app during the workday. Patients belong to the clinic. Any doctor signed in to the clinic can open any patient.

One doctor is the owner and also sees patients. There is always one owner. Inside the app, only doctors have accounts.

Several doctors can be signed in at the same time, each on their own computer. A doctor signs out before another person uses that computer. After 15 minutes with no use, the doctor is signed out. A signed-out screen shows no patient details and no unsaved text.

## Language and layout

Every screen is available in English and Arabic. Each doctor switches the language on their own account. Until they switch, the screens are in English. Visit text and surgery text are stored exactly as the doctor typed them. Name search matches the characters typed, in English or Arabic letters.

V1 is laid out for a computer screen in the consultation room. A doctor signs in from a browser that can reach the service, on that computer or on another computer they use.

The invite email and the password-reset email are in English.

## Time and place

Times are shown in Egypt’s local time: UTC+2 in winter and UTC+3 in summer.

The clinic’s city is chosen from Egypt’s governorates. It starts as Aswan. The owner can change it to any other governorate.

## Patients

Each patient record holds:

- Full name
- Date of birth
- Sex: female, male, or left blank
- Phone
- City, chosen from Egypt’s governorates
- Address, for the street or village

Creating a patient requires full name, phone, and date of birth. Sex, city, and address can be saved after that. Creating a patient also stores that the patient agreed the clinic will keep this record, with the doctor and the time.

The phone number is an Egyptian mobile number: 11 digits, starting with 01. It belongs to one patient in the clinic, including children and inactive patients. Saving a patient requires a number the clinic does not already have. Searching a phone number opens that patient.

The doctor finds a patient by name or phone. When more than one patient matches the name, the doctor sees a list with name, phone, and date of birth, and opens one of them. If name and phone find nobody, any doctor creates the patient.

Any doctor can update full name, date of birth, sex, phone, city, and address. The later save becomes the current details. The earlier save stays in the history. Each history entry shows the doctor and the time.

A patient record is kept permanently. Any doctor can mark a patient inactive. Inactive patients stay out of name search. Any doctor can open the inactive list and mark a patient active again. While inactive, the phone number still belongs to that patient, and searching it opens the record. A mistaken extra record is marked inactive. Both records remain in the clinic.

An inactive patient cannot be given a new appointment. Appointments already reserved stay until a doctor cancels them.

## Visits

On the patient record, a doctor writes each visit. A visit stores:

- The date and time it was saved, shown in Egypt’s local time
- The name of the doctor who wrote it, kept as it was at that moment
- Four free-text fields: why the patient came, findings, assessment, and plan

At least one of the four fields must contain text. The author can fill the rest later. Any doctor can add a visit to any patient. After a visit is saved, only the doctor who wrote it can change it. The previous text stays in the history. A saved visit remains on the patient.

The visit note is separate from an appointment. The open patient shows the current details, visits with the newest first, the history of earlier details and earlier visit text, and that patient’s upcoming and past appointments. Any doctor can read that history.

Saving needs a working internet connection. The record is stored in the clinic’s shared database when the doctor saves. If the save cannot reach the server, the text remains on the screen while that doctor is still signed in, and the doctor can save again.

## Centers and appointments

Any doctor can add a center. A center has a name and its room numbers. Room numbers are unique inside a center. Any doctor can add more room numbers later, and any doctor can rename a center.

A center or room with no appointments can be removed. One that already has appointments can be closed to new bookings. Past appointments still show its name and room.

A doctor reserves an appointment on a patient by choosing the center, then one of that center’s rooms, then the date, the start time, and the minutes the room is needed. The app offers 30 minutes, or 60 when the appointment is a surgery. The doctor can change the minutes. The room is busy for that whole stretch. Another appointment cannot overlap it. The reserving doctor can move it to another free room or time.

When the appointment is a surgery, it cannot be saved until the surgery description contains text. The surgery description stays on the appointment. The reserving doctor can change that text, and the previous text stays in the history.

The reserving doctor can cancel the appointment. Cancelling keeps it on the patient as cancelled, with the doctor and the time of cancellation.

Any doctor can open a day list of the clinic’s appointments, in start-time order, showing the patient, center, room, time, and whether it is a surgery.

## Accounts

The create-owner screen appears once, before any owner exists. The owner enters the clinic’s name, their own name, their email, and a password. After that, doctors enter through sign-in. There is no public page that creates a second clinic.

The owner adds each other doctor by email and enters that doctor’s name. The invite email asks that doctor to set their own password. Visits show the doctor’s name from the moment the visit was saved. A later change of display name does not rewrite old visits.

A doctor can change their display name and their password. The email remains their login. From the sign-in screen, a doctor can set a new password through their email.

The owner cannot remove their own login. The owner can name another doctor as the new owner. That new owner can then remove the previous owner’s login. The owner can remove another doctor’s login. Visits that doctor already wrote stay on the patient and still show that doctor’s name.

## The service

V1 is one running service for this one clinic. The connection to the service is encrypted, and the database is encrypted at rest. The database and the daily backups are hosted in Egypt. The clinic remains responsible for its own license to hold sensitive health data.

The service saves a backup of the clinic database every day and keeps each daily backup for 30 days. People who operate the service can restore the clinic database from a backup.

The owner can download one file of the current patient details, the visits, the kept history, the appointments, cancelled appointments, and surgery text.
