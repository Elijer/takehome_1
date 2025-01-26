# Technical Interview Questions for Backend/Data Engineer at -REDACTED-

Thank you for your interest in joining as a backend engineer at -REDACTED-. We are always looking for talented engineers to join the team. 

## Instructions

Please read the following set of questions and prepare to discuss them during our technical discussion interview. Please schedule to meet again to discuss your solutions.

You will notice that there’s actually no code-submission required. This is a take-home that is more of “Here are questions that we care about and are relevant to our engineering needs”. It is up to you on how much you want to do. Some questions might more easily be explained by sharing code/diagram with us. Verbally discussing them is also fine. We do not require any code submission but you can share us your answers.

Please schedule a meeting with Leon Kim at https://calendar.app.google/pcxYyMcjR22RS9rM7  when you are ready to discuss. Other members may join as needed.

## Interview Process & Goals

We do not have leetcode-style online assessment. We expect that you would use StackOverflow, ChatGPT etc. to solve these questions. We don’t care how. We also don’t care what language to solve the problem. The follow-up meeting is intended to discuss and analyze the implementations.

The work done here can be posted on personal git repository or website for portfolio purposes. Please make sure to exclude any mention of “-REDACTED-” in the files if you do.

## Questions

Q1) This is an example of JS code that queries MongoDB using mongoose library. We use mongoose as our ODM library.

```jsx
const ResultSchema = new mongoose.Schema({
  clinic_id: ObjectId, // This is a "foreign key" to Clinic collection
  patient_id: Number, // This is a "foreign key" to Patient collection
  field_nm: String,
  field_value: String
});

// Instantiate the model to access the Result collection in DB
const ResultModel = mongoose.model('Result', ResultSchema);

async function getTableData(clinicId) {
  // part 1
  const dpList = await ResultModel.find({ clinic_id: clinicId }).exec();

  // part 2
  const dynamicList = [];
  let rowMap;
  let prevRowId = -1;
  for (const dp of dpList) {
    if (dp.patient_id !== prevRowId) {
      rowMap = new Map();
      dynamicList.push(rowMap);
    }
    prevRowId = dp.patient_id;

    rowMap.set(dp.field_nm, dp.field_value);
  }

  return dynamicList;
}
```

This code could use some improvements (and fix a potential* bug!). For those who are not too familiar with mongoose library, the line `const dpList = ...` in ‘part 1’ simply fetches all the objects from MongoDB collection with matching `clinic_id` , and the returns objects from the Result collection have four properties: `clinic_id` , `patient_id`, `field_nm`, and `field_value` . The variable `dpList` contains DB fetch response, something like:

> *developer note: there's way more than one bug

```jsx
// clinic_id not shown for simplicity. It is the same for all objects
[
  { "patient_id": 1, "field_nm": "a", "field_value": "1", "clinic_id": ... },
  { "patient_id": 1, "field_nm": "b", "field_value": "2", "clinic_id": ... },
  { "patient_id": 3, "field_nm": "a", "field_value": "3", "clinic_id": ... }
]
```

### Q1a

The query in `getTableData` fetches matching result by `clinic_id`. There are cases where we want to query by matching `patient_id` and sometimes matching both on `clinic_id` and `patient_id`. As our `Result` collection grow large, what can we do to maintain efficient data fetches?

### Q1b

What is the expected result of `dynamicList`? What are the expected characteristics of the result?

### Q1c

The code in is not very JS-friendly. In fact, that code was converted from an actual Java code that was used in production at an undisclosed tech unicorn 🦄. I think we can do better 😄. Let’s improve it while guaranteeing the characteristics that you identified in Q1a.

Here are some technical expectations and guidelines:

- `dpList` will fit comfortably in memory with much more free RAM to spare for any reasonable compute.
- For this question, we will put the following bounds:
    - there  are 5 possible values of `patient_id` (e.g. `1`, `2`, `3`, `4`, and `5`)
    - There are 3 possible values of `field_nm` (e.g. `a`, `b`, and `c`) 
    but `dpList` is not guaranteed be a list of objects with all 3.
    
    <aside>
    📢 In reality at -REDACTED-, the cardinality of `patient_id` is unbounded (it scales depending on how many customers we have, e.g. `clinic_id`). The implementation in both bounded and unbounded cases could be similar regardless.
    
    We don’t expect the number of patients to be so big that we can’t do them in memory, and we know prior to the query what the possible values of `field_nm` are for a given `clinic_id`. We are just limiting the size to reduce the scope for the interview process.
    
    </aside>
    
- **[Requested Feature Change]** The output `dynamicList` should form a “rectangular matrix of 5 x 4” represented as array of JSON such that
    - the `dynamicList.length == 5`
    - `Object.keys(dynamicList[i]) === ['patient_id', 'a', 'b', 'c']` for all `i`
    - If `dpList` does not have a specific `field_nm` for a `patient_id`, then the value in the resulting `dynamicList[i][field_nm]` should have a sensible default.
    

The above conditions are just to tell you that this isn’t a “big data” problem where space and time complexities are the issue, although the implementation of this code should preferably not have unnecessary compute. The most important point is that the combination of `(patient_id, field_nm)` is not expected to be complete set. Some `patient_id`s will have all 3. Some will not have all 3. 

You can use MongoDB query, JS data manipulation, combination of both, and import any other libraries as you wish. Non-JS language is also acceptable. Pseudo code is also acceptable. You can also just convert the problem into a SQL one.

Note that the practical application for this is that the backend is constructing a full table without any missing table cell value for the frontend to display.

### Q1d

This is a challenge question for discussion purposes. This is one of the main data modeling challenge that we faced early in our app development.

We are not particularly keen on storing the data as described in `ResultSchema` (this is not the schema -REDACTED- use in production). Please prepare an alternative data modeling strategy. If you are unfamiliar with MongoDB / NoSQL schema design, you can propose a SQL-based one as well.

We need to store different patient attribute(s) for variety clinics in our `Result` collection. For example, Clinic A might have patients with attribute fields `['a', 'b', 'c']` while Clinic B might have `['b', 'c', 'd']` — but all patients within the same clinic are expected to have same attribute fields — i.e. all patients in Clinic A has  attribute fields `['a', 'b', 'c']` .

We need a fast lookup performance to uniquely identify a patient based on all the attribute fields for that clinic. We do not query across clinics.

This is a valid query:

- Find a patient in Clinic A who has a=1, b=2, and c=3
- Find a patient in Clinic B who has b=1, c=2, and d=3

This is not a query that we need to optimize for

- Find all patients Clinic A or B  that have b=2 and c=3

There are many ways to model requirement. We already have one that works well for us. We want to see what you can come up with. We are not asking for a perfect solution here. You can come up with an alternative schema. Just prepare to discuss the pros and cons of the `ResultSchema` vs your proposal.

In reality, we have constraints like this:

| clinic | # of patients | # of attribute fields |
| --- | --- | --- |
| A | 33,000 | 5 |
| B | 30,000 | 3 |
| C | 13,000 | 7 |
| D | 10,000 | 6 |
| E | 7,000 | 3 |

At -REDACTED-, the engineer often design features from scratch — from database schema design to all the way to HTTP API response (and frontend UI, if you are frontend-minded)

### Q2

A fellow -REDACTED- developer sees the following SQL query that is being used in production

```sql
SELECT 
  clinicId,
  patientId,
  birthDate
FROM
  Patients
WHERE
  1=1
  AND clinicId = 123
```

and makes a pull request to change it to

```sql
SELECT 
    clinicId
  , patientId
  , birthDate
FROM
  Patients
WHERE
  clinicId = 123
```

You did not write the original SQL statement (that developer no longer works here). You are tagged in the pull request for code review. 

What is your response to your team member’s change request?

### Q3

You have been tasked with implementing ~~Gen Alpha~~ modern -REDACTED- Logging module with usages like this

```jsx
// Example usage of finding a user by id and logging the error
const user = skibidi(async () => {
  await UserModel.findOne((user) => user.id === userId);
}).lowKey((error) => {
  yap("Error finding user", error);
});
```

### Q3a

Implement `skibidi`, `lowKey` and `yap`(can be in non-JS language). You can optionally implement with different usage syntax other than the above. The requirement is that `lowKey` is a chainable method.

### Q3b

A fellow -REDACTED- developer found OSS community implementation of `skibidi`, `lowKey` , and `yap` and added the community version library to our codebase. This became our logging module for production. A new developer (aka you) joined to review this code. Upon inspection you realize that the community version is logging the error message to the local process only and currently the logs are being stored in daily batch file on local filesystem. It is fortunate that our production instance never went down because you can see all the logs from the beginning day when this logging system was implemented

You know that this logging module is expected to be deployed to multiple instances and work in distributed fashion. Describe your strategy to implement a new logging system with your teammates.

### Q4

The table below shows results from an A/B test of a product feature on a continuous metric.

| **group** | **N** | **Mean** | **Standard Deviation** | **% lift 
(relative to control)** |
| --- | --- | --- | --- | --- |
| control | 12,000 | 7.0 | 4 |  —— |
| variant A | 12,000 | 6.7 | 3 | -4.2% |
| variant B | 12,000 | 7.1 | 6 | 1.4% |

Describe the results of the experiment and make recommendation to the team about which variant or control to use for production. Make any necessary assumptions but please state those assumptions. What the metric measures is intentionally not stated — this is one of the assumptions that you would have to make.