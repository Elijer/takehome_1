// import { Schema, Types, model, Document } from 'mongoose';
import {  getTableData } from "./src/getTableData";
import {  getTableDataAgg } from "./src/getTableDataAgg";

import mongoose from "mongoose";

const dbName = "clasp";
const clinicId = "67916e35770af477755dc55d";
mongoose.connect(`mongodb://localhost:27017/${dbName}`);
console.time('build table')
// await getResults()
// const result = await getTableData(clinicId);
const result = await getTableDataAgg(clinicId);
// const result = await getTableDataAgg2(clinicId);
for (const r of result){
  console.log(r)
}
console.timeEnd('build table')
mongoose.connection.close();