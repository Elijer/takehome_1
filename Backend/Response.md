# Challenge
view at [./Challenge.md](Challenge.md).

# Q1

## Initial Questions
1. What are these results used for?
2. Are `patient_id`'s unique across clinics?
3. How frequently are `field_nm`'s updated per patient? Are they ever?
4. Will different clinics have different sets of possible `field_nm`'s? answer: yes
5. Might the set of `field_nm`'s per clinic change in the future? How frequently?

## Q1a: As our Result collection grow large, what can we do to maintain efficient data fetches?
1. Combine pagination and timestamp to reduce compute and network time: creating a descending `{createdAt: -1}` index  fetch response to most recent results.
1. Maintaining separate *and* potentially compound indexes of `clinic_id` and `patient_id` would increase the performance of queries fetching against one, or both.
1. Use database query profiling to identify frequent, slow requests. We could configure what thresholds trigger email alerts or send those logs to a central logger and handle there.
1. Implement caching with WireTiger or similar to cache frequent queries.
1. Cache geographically common requests with CDN in front of API request layer, which might align well with customer base of brick-and-mortar clinics.
1. If we outgrow these techniques, shard off large clinics, clearly separate customer regions.
1. MongoDB time series collections might be worth looking into.

## Q1B: What is the expected result of dynamicList? What are the expected characteristics of the result?

- An exhaustive list of existing `field_nm` : `field_value` pairs of each patient.

```ts
[
	{ // patient 1
		'field_nm_1': 'field_value_1',
		'field_nm_2': 'field_value_2',
		'field_nm_3': 'field_value_3',
	},
	{ // patient 2
		'field_nm_1': 'field_value_1',
	},
	{ // patient 3
		'field_nm_1': 'field_value_1',
		'field_nm_2': 'field_value_2',
	},
]
```

**Characteristics:**
- "Headless" - although grouped by common `patient_id`, this isn't clear in data
- Or at least the function seems to *expect* they will be grouped by patient_id, but this probably won't happen - the provided function makes the assumption that the payload MongoDB returns is ordered by patientID, but MongoDB doesn't return things in sorted order by default. I think this could be fixed by sorting the results before returning them, and it's kind of a clever way to group a collection using in O(n) time (excluding the sort function - which to be fair MongoDB can make efficient with indexing) but I'm going to go a different direction.


## Q1C: Improve patient results algorithm while guaranteeing characteristics identified earlier, with some feature changes and constraints.

**Suggested Improvements**
- Use an aggregation Pipeline to `$group` results by `patient_id` and filter out empty documents.* This strategy:
	- reduces data over network
	- utilizes MongoDB indexing performance
	- returns an intuitive payload, keeping codebase concise and readable.
- Index `createdAt`, `patient_id`, `clinic_id`, and a compounds query of `patient_id` and `clinic_id` to improve query performance
- Added optional `patientId` parameter to function
- `wiredTiger`, `$hint`, sharding and profiling can be used to further reduce any future bottlenecks.

### Implementation One: Employing `$group`
[./src/getTableDataAgg.ts](./src/getTableDataAgg.ts)
My favorite implementation is to use a two-stage MongoDB aggregation pipeline to pre-group data by `patient_id`, which seems to be more performant than in-memory grouping, minimizes data sent over network, and in my opinion keeps the codebase very readable:

### Implementation Two: Group Table Data In-memory
[./src/getTableData.ts](./src/getTableData)
MongoDB aggregations is a preference and a recommendation, but it's possible to do the same thing without an aggregation pipeline. The performance is half as good ([check out these performance results'](./PerformanceResults.md)) and the code is a little less clear but will make sense to engineers of all backgrounds.

**Weaknesses of approaches**
	- For each implementation, technically the *entire* `Results` for a particular clinic would need to be searched in order to generate comprehensive lists  of field/value pairs, making it tricky to use `limit` and pagination
	- if there are a lot of duplicate key/value pairs in the result collection, we're still returning...all of them, and then deduping them in memory. Every time we read.

> Example data below

| patient_id | Name   | Nickname          | MSK concern            |
| ---------- | ------ | ----------------- | ---------------------- |
| 1          | ---    | Twinkle Toes      | Gout                   |
| 2          | Katara | Hwamei            | Hemophilic Arthropathy |
| 3          | Sokka  | Captain Boomerang | Medial Epicondylitis   |
| 4          | Toph   | Blind Bandit      | ---                    |
| 5          | ---    | The Blue Spirit   | Vasculitis             |

# Q1d: Improve Data Model
The above implementation has some strengths (i.e. historically complete data!) and some weakness (i.e. not easy to limit queries). This is the strategy I would take to improve upon it:
2. Create a `Patient` collection with an embedded document of fields
3. When new `Results`  info is submitted, it updates fields on the embedded document. This makes it easy and straight-forward to
	1. retrieve patient info with just an `id` and/or
	2. with any combination of queries to `field_nm/value`  pairs associated with them.
4. Every `Patient` document should be initialized with all of the fields associated with that patient's `Clinic` as `null` values for the most normalized data embedded documents, making it more straightforward to query them, but also easy to see when they *could* exist in a query payload.
5. If a `Clinic` ever changes the possible `field_nm`'s associated with it, migrate all patients associated with clinic to remove or add those new `field_nm`'s (potentially using the `Results` data)
6. Optionally keep and simultaneously maintain the `ResultSchema` as a record of historical data.

Rationale: This system shifts the computational overhead to *writing data*, so that frequent reads don't require complex queries, grouping for all retrieved documents because writing has done that maintenance ahead of time.

Fields on embedded documents can be indexed just like normal fields, allowing for fast lookups, sensible collocation of patient data and a bonus of straightforward cache-invalidation.

## The case for keeping a parallel `Results` collection
The above system *would* work without `Results`, since up-to-date info can be kept in the `Patient` document.

However, it wouldn't be difficult to maintain this parallel collection, and it has a lot of benefits
- Keeps the option open to query the state of `Patient` records at an arbitrary point in the past
- Would prevent changes to a clinic's allowed fields from being a destructive data operation, allowing fields associated with a clinic to be added and removed more flexibly.
- The record of changes to a patient's info could be helpful in the future.
- Could make cross-clinic analytics way easier

# Q2
Since I don't have much experience with SQL, this is a great opportunity for me to understand both what was going on with the original query as well as why my colleague is proposing the changes in their PR.

I would ask what the purpose was in changing the SELECT query so that the commas are at the beginning, after getting a bit of context about whether this is common.

I'd basically do the same thing with removing 1=1 - I would spend a couple minutes looking to see if this is a documented convention with a purpose in the SQL community. Then I'd ask if this changes code execution at all, which I don't think it should based on that search, but maybe it could if there are any SQL queries created or altered programmatically in our repo.

I would also ask if this same type of change could apply to other SQL queries as well, in which case I would ask if it's a better strategy to reformat old style conventions commit by commit or in larger, more planned chunks to keep our version history easier to look through by the team.
# Q3b

Oof, well first off I would make a backup of that daily batch file basically anywhere off of that server so we have it when it *does* go down.

I think first off it would be good to see if we can set up Fluentd or Logstash in the meantime. This
- gives us logs quickly
- gives us a logging solution to compare an idea solution to.

Essentially, I want to buy us time to consider our logging solution a bit more carefully without holding up the existence of logging, which we need just in some form ASAP. So the crucial action points here are:
- get some level of adequate, durable/persistent logs on all services ASAP without draining too much engineer time
- compile a list of sensible requirements for logging from the whole team so that we can start to implement that now and aren't kicking ourself four months later and looking through poorly thought out logs.

Basically, I'm not a logging expert. I've used Sentry and Cloudwatch in the past and they helped immensely. Sentry wasn't bad and allowed for source-control tags and source-map tracing which was dope. Cloudwatch was nice in how thorough it was in capturing data from *all instances*, but it wasn't the best to search through. So I have some experience but would really be interested in combining it with the insight of others so we can put together our aggregate logging lessons. There are some really good docs on good logging practices out there.

[I've started to put together a survey of logging options](https://www.figma.com/board/XVTU1Ulh4VCR8vsQOEMqN0/Architectural-Design?node-id=212-1139&t=dMhkmMEvSS93rZnW-1).

Basically, I'm tempted to piece together a messaging-queue library with a set of custom logging structures that get dumped to a central MongoDB instance just so I can get a feel more building a logger directly, and I don't think that reinventing the wheel is *entirely* out, but it does seem silly when so many existing logging services exist and engineering can be spent doing more important things.

Here are the factors I've come up with so far for the conversation:

**Requirements**
- errors are persisted
- central
- doesn't introduce much overhead
- structured. it's silly to have unstructured logs
	- by service
	- by instance
	- by userID
- built in alerting via slack
- can obfuscate PII

**Nice-to-haves**
- lots of context
	- source-mapped errors to the lines causing them
	- includes hash of responsible commit
	- instance of a service logging
- easy route to setting up alerts on filters of logs
- visualization tools
- easy of access - not a total luxury. Like having a CLI or a desktop application or something.

**Luxuries**
- maybe even the blame of the line from version control

This is what 12Factor says about logs:
https://12factor.net/logs

# Q4

Assumptions
- Lift is good, namely that it refers to customer satisfaction. Might not be though:
- Test groups are divided with a totally random method. An example of how this might *not* be the case is if userId is an incremented `id`. Divided them evenly by `id` might result in some groups being younger than `others`.
- That the IVs are controlled - like, group A wasn't sent an email group B didn't get that isn't related to the IV. "Thanks for testing with us! Don't tell group B but we gave you this really cool feature we think you're going to love". Placebo, priming - bad experimental design
- The split is totally new - if we were to recycle split groups, they start off with different experiences
- that Variant A and variant B *aren't* necessarily opposites (not a bad strategy though)
- arbitrarily, that we have a history of observing previous changes with 7-8% changes in either direction, so by comparison, these ones are somewhat on the modest side. Again, arbitrary, but I think that realistically the weight these findings have is going to be relative to a body of other results we've gotten.

First off, I would get more info than in this table. I would plot all results on the graph showing the distribution each direction around the mean. I'd also check out screen captures if available from some promising outliers in each and make a couple notes on what I saw, and contact those customers to see if I can get some feedback from them. Particularly for Variant B with higher variability, I would check to see if the results correlated with any demographic data.

In the meantime, I would just continue using control. Although higher, Variant B has such higher standard deviation, I'd really want to understand what is causing all of this variability. If all variability is on the positive side, I'd recommend we just go for it. But if a half or more of that variability is on the left (negative) side, I don't think 1.4% is a good enough gain in satisfaction or whatever to change our product and potentially be worsening the experience for hundreds of people without yet understanding who those people are and how their experience has changed.

Variant A in this case obviously should be discounted as a good option to deploy, but it *is* probably the more informational option since its results are so focused and dramatic in comparison to B. I think this is just as important to understand and reach out to customers about, because it will teach us things *not to do* which can be documented, extrapolated to avoid similar mistakes, and potentially give us our next hypothesis to test based on inverting whatever people didn't like in Variant A.

