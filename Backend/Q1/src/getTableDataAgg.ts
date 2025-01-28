import { Schema, SchemaTypes, model, Types} from "mongoose";

const ResultSchema = new Schema({
  clinic_id: { type: SchemaTypes.ObjectId, required: true },
  patient_id: { type: Number, required: true },
  field_nm: { type: String, required: true },
  field_value: { type: String, required: true },
});

const ResultModel = model("results", ResultSchema);

interface DBResult {
  _id: number,
  fields: [string, string]
  // field_nms: string[],
  // field_values: string[]
}

export async function getTableDataAgg(clinicId: string, patientId: number | null = null): Promise<string> {

  try {
    const matchStage = {
      $match: {
        clinic_id: castAsObjectId(clinicId), // necessary fix for known issue: https://github.com/Automattic/mongoose/issues/1399
        field_nm: { $ne: '', $exists: true },
        field_value: { $ne: '', $exists: true },
        ...patientId ? {patient_id: patientId} : {}
      }
    }
  
    const dbResult: DBResult[] = await ResultModel.aggregate([
      matchStage,
      {
        $group: {
          _id: '$patient_id',
          fields: {
            $push: {
              $concatArrays: [ ["$field_nm"], ["$field_value"] ]
            }
          }
        }
      },
      {
        $limit: 200
      }
    ]).exec();
  
  
    return transformAggregationResultToJSONTable(dbResult)
  } catch(e){
    console.error(e)
  }
}

function transformAggregationResultToJSONTable(results: DBResult[]): any {

  const fieldNmKey = {
    "name": 1,
    "nickname": 2,
    "msk concern": 3
  }

  const fieldNmKeys = Object.keys(fieldNmKey)
  const fieldNmSpace = fieldNmKeys.length
  const emptyVal = "---"

  const tableData: (string | number )[][] = []

  try {
    for (let result of results){
      const { _id: patientId, fields} = result
      const emptySlots = Array.from({length: fieldNmSpace}, ()=>emptyVal)
      const i = tableData.push([patientId, ...emptySlots]) - 1
      for (const j in fields){
        const [name, value ] = fields[j]
        if (Object.keys(fieldNmKey).includes(name)){
          const fieldTableCol = fieldNmKey[name]
          tableData[i][fieldTableCol] = value
        }
      }
    }
    // return JSON.stringify(tableData, null, 2);
    return tableData
  } catch (e){
    throw new Error(`Problem transforming table aggregate ${e}`)
  }
}

function castAsObjectId(id: string){
  try {
    return new Types.ObjectId(id)
  } catch(e){
    throw new Error(`Couldn't build mongo ObjectId for id ${id}: ${e}`)
  }
}