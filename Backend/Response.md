# Challenge
view at:
- [./Challenge.md](Challenge.md).

# Q1

## My Initial Questions
1. What are the results for? It looks like they are individually submitted responses to a form that may be updated over time, is that true?
2. Are `patient_id`'s unique across clinics?
3. Are `field_nm`'s guaranteed to have just one value in per patient
4. Will different clinics have different sets of possible `field_nm`'s?

## Q1a: As our Result collection grow large, what can we do to maintain efficient data fetches?
1. A combination of pagination and timestamps would allow us to meaningfully limit query computational load and result size, a big plus with larger collections. Creating a descending `{createdAt: -1}` index allows us to fetch response to most recent results.
1. Maintaining separate *and* potentially compound indexes of `clinic_id` and `patient_id` would increase the performance of queries fetching against one or both
1. Use database query profiling to identify frequent, slow requests. Atlas allows thresh-hold email alerts, or use logs another way.
1. Database caching using wireTiger or custom implementation can cache frequent or expensive queries.
1. Geographically common requests can also be cached onAPI request layer via a CDN, which could be relevant for brick-and-mortar-clinics.
1. If the result collection gets really big, we can shard off large clinics, or clearly separate regions.
1. The find function native to mongodb, and the method in mongoose as well, allows for a search object to be passed that can contain multiple query keys, so to search for both a `clinic_id` AND a `patient_id`, we can just pass both of those things into the query!
1. MongoDB time series collections may be worth looking into depending on future of this feature.

## Q1B: What is the expected result of dynamicList? What are the expected characteristics of the result?
The expected result of dynamic list is to Map for every unique patent_name as a map of several of those Records so that the `field_name` is the key and `field_value` is the value:

```ts
[
	{
		'field_nm_1': 'field_value_1',
		'field_nm_2': 'field_value_2',
		'field_nm_3': 'field_value_3',
	},
	{
		'field_nm_1': 'field_value_1',
	},
	{
		'field_nm_1': 'field_value_1',
		'field_nm_2': 'field_value_2',
	},
]
```

**Characteristics:**
- One characteristic we can see they're kind of "headless" - they are just lists of data, with no `patient_id` as a key
- The function seems to expect they will be grouped by patient_id, but this is not necessarily what will happen, since MongoDB doesn't return things in sorted order of id unless specifically sorted.


## Q1C: Improve patient results algorithm while gauranteeing characteristics identified earlier, with some feature changes and constraints.

**Suggested Improvements**
- use MongoDB Aggregation, specifically `$group` stage to group results by `patient_id` and exclude empty value documents, thereby reducing data over network, and also provide `patient_id` pre-mapped to fields, keeping codebase readable and concise
- Add `createdAt`, `.limit()`, and pagination to handle larger collection sizes.
- Index `createdAt`, `patient_id`, `clinic_id`, and a compounds query of `patient_id` and `clinic_id` to improve query performance
- Added optional `patientId` parameter to function
- `wiredTiger`, `$hint`, sharding and profiling can be used to further reduce any future bottlenecks.

### Implementation One: Employing `$group`
[./src/getTableDataAgg.ts](./src/getTableDataAgg.ts)
My favorite implementation is to use a two-stage MongoDB aggregation pipeline to pre-group data by `patient_id`, which seems to be more performant than in-memory grouping, minimizes data sent over network, and in my opinion keeps the codebase very readable:

### Implementation Two: Group Table Data In-memory
[./src/getTableData.ts](./src/getTableData)
MongoDB aggregations is a preference and a recommendation, but it's possible to do the same thing without an aggregation pipeline. The performance is half as good ([check out these performance results'](./PerformanceResults.md)) and the code is a little less clear but will make sense to engineers of all backgrounds.

> Example data below

| patient_id | Name   | Nickname          | MSK concern            |
| ---------- | ------ | ----------------- | ---------------------- |
| 1          | ---    | Twinkle Toes      | Gout                   |
| 2          | Katara | Hwamei            | Hemophilic Arthropathy |
| 3          | Sokka  | Captain Boomerang | Medial Epicondylitis   |
| 4          | Toph   | Blind Bandit      | ---                    |
| 5          | ---    | The Blue Spirit   | Vasculitis             |

# Q1d: Improve Data Model

This is the strategy I would take:
2. Create a `Patient` collection.
3. When new `fieldn_nm` and `field_value` information is submitted, it should update fields on an embedded document we can call `info`. This makes it easy and straight-forward to retrieve patient info with just an `id`, and/or based on any combination of queries to `field_nm/value`  pairs associated with them.
4. Every `Patient` document should be initialized with all of the fields associated with that patient's `Clinic` as `null` values for the most normalized data embedded documents, making it more straightforward to query them, but also easy to see when they *could* exist in a query payload.
5. If a `Clinic` ever changes the possible `field_nm`'s associated with it, run migrations on all patients to remove or add those new `field_nm`'s
6. Optionally keep and simultaneously maintain the `ResultSchema` as a record of historical data.

Rationale: This system shifts the computation to writing data, so that frequent reads don't require complex queries, grouping, and computational overhead.

Fields on embedded documents can be indexed just like normal fields, ultimately allowing for really fast lookups, sensible collocation of patient data and a bonus of straightforward caching and cache-invalidation.

## The case for keeping a parallel `Results` collection
The above system would definitely work *without* `Results`, since all of the up-to-date info can be kept inside of the embedded `PatientInfo` document inside of each `Patient` document.

However, it wouldn't be difficult to maintain this parallel collection, and it has a lot of benefits
- Keeps the option open to query the state of `Patient` records at an arbitrary point in the past
- Would prevent changes to a clinic's allowed fields from being a destructive data operation, allowing fields associated with a clinit to be added and removed more flexibly.
- The record of changes to a patient's info could be helpful in the future.
- Could make cross-clinic analytics way easier

# Q2
Since I don't have much experience with SQL, this is a great opportunity for me to understand both what was going on with the original query as well as why my colleague is proposing the changes in their PR.

I would ask what the purpose was in changing the SELECT query so that the commas are at the beginning, after getting a bit of context about whether this is common.

I'd basically do the same thing with removing 1=1 - I would spend a couple minutes looking to see if this is a convention with a purpose. Then I'd ask if this changes code execution at all, which I don't think it should based on that search.

Since these don't *seem* to be functional changes, I would also ask if this type of change could be made in other places as well, in which case I would ask if it's a better strategy to reformat old style conventions commit by commit or in larger, more planned chunks to keep our version history easier to look through by the team.

# Q3


## Q3a


## Q3b
Oof, well first off I would make a backup of that daily batch file basically anywhere off of that server so we have it when it *does* go down.