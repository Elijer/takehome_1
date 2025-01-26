import mongoose from "mongoose";
import { faker } from '@faker-js/faker';
import { ResultModel } from './getTableData';

const iterations = 500000
const possiblePatientIds = 10

const field_nms = {
  "name": faker.person.firstName,
  "nickname": ()=>faker.animal.insect()+" "+faker.color.human(),
  "fav color": faker.color.human,
  "msk condition": faker.person.zodiacSign
}

const field_nm_keys = Object.keys(field_nms)

interface Person {
  clinic_id: mongoose.Types.ObjectId,
  patient_id: number,
  field_nm: string,
  field_value: string
}

function createRandomPerson(): Person {

  const randomField = faker.helpers.arrayElement(field_nm_keys)

  return {
    clinic_id: new mongoose.Types.ObjectId('67916e35770af477755dc55d'),
    patient_id: Math.floor(Math.random()*possiblePatientIds),
    field_nm: randomField,
    field_value: field_nms[randomField]()
  }
}

async function main(){
  const dbName = "clasp";
  console.time(`writing`)
  await mongoose.connect(`mongodb://localhost:27017/${dbName}`);
  const users: Person[] = []
  for (let i = 0; i < iterations; i++){
    users.push(createRandomPerson())
  }
  await ResultModel.insertMany(users)
  .then(docs => console.log(`${docs.length} users have been inserted into ${dbName}`))
  .catch(err => {
    console.error(err);
    console.error(`${err.writeErrors?.length ?? 0} errors occurred during the insertMany operation.`);
  });
  console.timeEnd(`writing`)
  await mongoose.connection.close();
}

main()