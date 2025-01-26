import mongoose from "mongoose";
import { faker } from "@faker-js/faker";
import { ResultModel } from "./getTableData";
import { ClinicModel } from "./clinicModel";

const iterations = 500000;
const possiblePatientIds = 10;
const clinics = 15;

const field_nms = {
  name: faker.person.firstName,
  nickname: () => faker.animal.insect() + " " + faker.color.human(),
  "fav color": faker.color.human,
  "msk condition": faker.person.zodiacSign,
};

const field_nm_keys = Object.keys(field_nms);

interface Person {
  clinic_id: mongoose.Types.ObjectId;
  patient_id: number;
  field_nm: string;
  field_value: string;
}

interface Clinic {
  name: string;
  state: string;
  possiblePatientFields: string[];
}

function createRandomClinic(): Clinic {
  return {
    name: faker.company.name(),
    state: faker.location.state(),
    possiblePatientFields: faker.helpers.arrayElements(field_nm_keys, faker.number.int({ min: 1, max: field_nm_keys.length })),
  };
}

async function generateClinics(): Promise<mongoose.Types.ObjectId[]> {
  const clinicDocs: Clinic[] = [];
  for (let i = 0; i < clinics; i++) {
    const clinic = createRandomClinic();
    clinicDocs.push(clinic);
  }
  const createdClinics = await ClinicModel.insertMany(clinicDocs);
  return createdClinics.map((clinic) => clinic._id);
}

function createRandomPerson(clinicIds: mongoose.Types.ObjectId[]): Person {
  const randomField = faker.helpers.arrayElement(field_nm_keys);

  return {
    clinic_id: faker.helpers.arrayElement(clinicIds),
    patient_id: Math.floor(Math.random() * possiblePatientIds),
    field_nm: randomField,
    field_value: field_nms[randomField](),
  };
}

async function main() {
  const dbName = "clasp";
  console.time(`writing`);
  await mongoose.connect(`mongodb://localhost:27017/${dbName}`);

  // Clear existing data
  console.log("Clearing existing data...");
  await ClinicModel.deleteMany({});
  await ResultModel.deleteMany({});

  // Generate clinics
  console.log("Generating clinics...");
  const clinicIds = await generateClinics();
  console.log(`${clinicIds.length} clinics have been created.`);

  // Generate users
  const users: Person[] = [];
  for (let i = 0; i < iterations; i++) {
    users.push(createRandomPerson(clinicIds));
  }

  // Insert users
  console.log("Inserting users...");
  await ResultModel.insertMany(users)
    .then((docs) => console.log(`${docs.length} users have been inserted into ${dbName}`))
    .catch((err) => {
      console.error(err);
      console.error(`${err.writeErrors?.length ?? 0} errors occurred during the insertMany operation.`);
    });

  console.timeEnd(`writing`);
  await mongoose.connection.close();
}

main();
