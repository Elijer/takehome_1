import { ClinicModel, ResultModel } from "./models";
import mongoose from "mongoose";
import fs from 'fs'

const dbName = "clasp";
const LOG_LOCATION = './logs.txt'

function yap(message: string, error: Error | null = null ): void {
  if (!error){
    console.log(message.green)
  } else {
    console.error(`${message}:`, error.message || error);
  }
  
  const date = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  const time = formatter.format(date)
  const msg = error ? `${message}: ${error.message || error}` : message
  const content = time + ": " + msg + "\n"
  fs.appendFile(LOG_LOCATION, content, err => {
    if (err) console.error("yap ain't yappin:", err);
  });
}

function skibidi(iffyOperation) {
  return {
    lowKey: function (errorHandler) {
      return iffyOperation()
        .catch((error) => errorHandler(error));
    },
  };
}

async function main(){

  await mongoose.connect(`mongodb://localhost:27017/${dbName}`);

  try {
      const result = await skibidi(async () => {
        const result = await ResultModel.findOne().exec();
        if (!result){
          throw new Error("Didn't find any results in the results collection");
        }
        const clinic = await ClinicModel.findOne().exec();
        if (!clinic){
          throw new Error(`Couldn't find clinic for result ${result._id}`);
        }

        throw new Error("YO")

        yap("We got the result!")

        return result

      }).lowKey( async(error: Error) => {
        yap('Error finding user', error)
      })

      console.log(result)

  } catch(error){
    yap("Problem connecting to MongoDB", error)
  } finally {
    await mongoose.connection.close();
  }
}

main()