import Efficiency from "./Efficiency";

export const DOCUMENT_CATEGORIES = {
  recruitment: {
    name: "Recruitment & Appointment Documents",
    documents: [
      { id: 1, name: "Appointment letter" },
      { id: 2, name: "Letter of acceptance of appointment" },
      { id: 3, name: "Oath or affirmation" },
      { id: 4, name: "The agreement" },
    ],
  },
  personal: {
    name: "Personal & Health Records",
    documents: [
      { id: 5, name: "Medical record" },
      { id: 6, name: "Asset declaration" },
      { id: 7, name: "Behavior and note sheets" },
    ],
  },
  identification: {
    name: "Personal Identification Documents",
    documents: [
      { id: 8, name: "Original copy of birth certificate" },
      { id: 9, name: "Copy of National Identity Card" },
    ],
  },
  family: {
    name: "Family Information Documents",
    documents: [
      { id: 10, name: "Widow's and Orphan's Pension Number" },
      { id: 11, name: "Marriage certificate" },
      { id: 12, name: "Spouse's birth certificate" },
      { id: 13, name: "Copy of Spouse's National Identity Card" },
      { id: 14, name: "Children's birth certificates", isVariable: true },
    ],
  },
  conduct: {
    name: "Conduct & Recognition Records",
    documents: [{ id: 15, name: "Letters of Commendations and Censures" }],
  },
  education: {
    name: "Educational & Qualification Records",
    documents: [
      { id: 16, name: "Copy of GCE O/L certificate" },
      { id: 17, name: "Letter of acceptance of certificate (O/L)" },
      { id: 18, name: "Copy of GCE A/L certificate" },
      { id: 19, name: "Letter of acceptance of certificate (A/L)" },
      { id: 20, name: "Copy of graduation certificate" },
      { id: 21, name: "Letter of acceptance of certificate (Graduation)" },
    ],
  },
  service: {
    name: "Service & Career Progression Records",
    documents: [
      { id: 22, name: "Confirmation of appointment" },
      { id: 23, name: "Letter regarding efficiency barrage flax" },
      { id: 24, name: "Salary increment deferral letters" },
      { id: 25, name: "Language proficiency certificates" },
      { id: 26, name: "Referee licenses" },
      { id: 27, name: "Certificates of efficiency bar tests" },
      { id: 28, name: "Promotion certificates" },
      { id: 29, name: "Salary Promotion Letters" },
    ],
  },

  efficiency: {
    name: "Efficiency Bar Exam ",
    documents: [
      { id: 35, name: "EB Level I" },
      { id: 36, name: "EB Level II" },
      { id: 37, name: "EB Level III" },
    ],
  },
  promotion: {
    name: "Promotion Class ",
    documents: [
      { id: 38, name: "Promotion Class III" },
      { id: 39, name: "Promotion Class II" },
      { id: 40, name: "Promotion Class I" },
    ],
  },
  salary: {
    name: "Salary Increment ",
    documents: [
      { id: 41, name: "Salary Increment Class III" },
      { id: 42, name: "Salary Increment Class II" },
      { id: 43, name: "Salary Increment Class I" },
    ],
  },
  leave: {
    name: "Leave & Disciplinary Records",
    documents: [
      { id: 30, name: "Letters on half-pay and unpaid leave" },
      { id: 31, name: "Leaving service or disciplinary orders" },
    ],
  },
  organizational: {
    name: "Organizational & Financial Information",
    documents: [
      { id: 32, name: "Letters of incorporation" },
      { id: 33, name: "Credit Card Information" },
      { id: 34, name: "Retirement Information" },
    ],
  },
};
