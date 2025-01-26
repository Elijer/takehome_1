import { Schema, SchemaTypes, model } from "mongoose";

type MongoOperator = { [operator: string]: any };

type Row = (string | number)[]

interface TableQuery {
  clinic_id: string
  field_nm: MongoOperator;
  field_value: MongoOperator;
  patient_id?: number
}

export const ResultSchema = new Schema({
  clinic_id: { type: SchemaTypes.ObjectId, required: true },
  patient_id: { type: Number, required: true },
  field_nm: { type: String, required: true },
  field_value: { type: String, required: true },
});

export const ResultModel = model("results", ResultSchema);

export async function getTableData(clinicId: string, patientId: number | null = null): Promise<string> {

  const emptyVal = "---"

  const fieldMap = {
    "name": 1,
    "nickname": 2,
    "msk concern": 3
  }

  const possibleFields = Object.keys(fieldMap)
  const rowLength = possibleFields.length + 1

  const query: TableQuery = {
    clinic_id: clinicId,
    field_nm: { $in: possibleFields },
    field_value: { $exists: true, $nin: ['', null] }, // schema enforced on write but still nice to have
  };

  if (patientId) query.patient_id = patientId;

  try {
    const dpList = await ResultModel.find(query).exec();
    const resultIndexMap: Map<number, number> = new Map()
    const rows: Row[] = []
  
    for (const result of dpList){
  
      const { patient_id, field_nm, field_value } = result
      
      if (!patient_id || !field_nm) continue
  
      let currentRowIndex: number | null = null
  
      if (!resultIndexMap.has(patient_id)){

        const newRow: Row = Array.from(
          {length: rowLength},
          ()=>emptyVal
        )

        newRow[0] = patient_id
        currentRowIndex = rows.push(newRow) - 1
        resultIndexMap.set(patient_id, currentRowIndex)
      }
  
      const rowIndex = currentRowIndex ?? resultIndexMap.get(patient_id)
      rows[rowIndex!][fieldMap[field_nm]] = field_value
  
    }
  
    return JSON.stringify(rows, null, 2);
  } catch (e){
    throw new Error(`failure querying database for table data: ${e}`)
  }
}
