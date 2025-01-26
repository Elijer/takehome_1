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

<br>
<br>
<br>

