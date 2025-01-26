import mongoose from "mongoose";
import { faker } from '@faker-js/faker';
import { UserModel} from './models';

const iterations = 200

interface User {
  clinic_id: mongoose.Types.ObjectId,
  name: string,
  favBook: string
}

const possibleClinics = [
  "6796c86f93be8c1fcac2d0ea",
  "6796c91293be8c1fcac2d0eb",
  "6796c92093be8c1fcac2d0ec"
]

function createRandomUser(): User {

  return {
    clinic_id: new mongoose.Types.ObjectId('67916e35770af477755dc55d'),
    name: faker.person.fullName(),
    favBook: faker.book.title()
  }
}

async function main(){
  const dbName = "clasp";
  console.time(`writing`)
  await mongoose.connect(`mongodb://localhost:27017/${dbName}`);
  const users: User[] = []
  for (let i = 0; i < iterations; i++){
    users.push(createRandomUser())
  }
  await UserModel.insertMany(users)
  .then(docs => console.log(`${docs.length} users have been inserted into ${dbName}`))
  .catch(err => {
    console.error(err);
    console.error(`${err.writeErrors?.length ?? 0} errors occurred during the insertMany operation.`);
  });
  console.timeEnd(`writing`)
  await mongoose.connection.close();
}

main()