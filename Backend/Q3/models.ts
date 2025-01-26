import { Schema, SchemaTypes, model } from "mongoose";

export const ClinicSchema = new Schema({
  name: {type: String, required: true},
  state: {type: String, required: true},
  possiblePatientFields: {type: [String], required: true}
});

export const ResultSchema = new Schema({
  clinic_id: { type: SchemaTypes.ObjectId, required: true },
  patient_id: { type: Number, required: true },
  field_nm: { type: String, required: true },
  field_value: { type: String, required: true },
});

export const ResultModel = model("results", ResultSchema);
export const ClinicModel = model("clinics", ClinicSchema);