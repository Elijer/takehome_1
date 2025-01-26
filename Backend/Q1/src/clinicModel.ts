
import { Schema, model } from "mongoose";

export const ClinicSchema = new Schema({
  name: {type: String, required: true},
  state: {type: String, required: true},
  possiblePatientFields: {type: [String], required: true}
});

export const ClinicModel = model("clinics", ClinicSchema);