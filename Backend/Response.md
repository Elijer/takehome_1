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

# Q3b

Oof, well first off I would make a backup of that daily batch file basically anywhere off of that server so we have it when it *does* go down.

I think first off it would be good to see if we can set up Fluentd or Logstash in the meantime as I think they would be quick to set up. We can see what it's like to use them and at least in the meantime we'd have eyes on issues in our code if need be. It's better than nothing.

Hopefully a longterm solution wouldn't take TOO much longer, but logs are important, and I think it's important to consider our logging needs from all perspectives of the team over the course of more than one day. Maybe everyone could just brainstorm all of the things they are going to want in a logger.

Architecture-wise, I think it would actually be pretty cool use a messaging-queue that processes locally saved logs and sends them


Requirements
- errors
- can ingest logs from multiple instances of the same app
- doesn't introduce much overhead
- structured. it's silly to have unstructured logs

Nice-to-haves
- lots of context
	- source-mapped errors to the lines causing them
	- includes hash of responsible commit
	- UUID
	- instance of a service logging
- easy route to setting up alerts on filters of logs
- visualization tools
- easy of access - not a total luxury. Like having a CLI or a desktop application or something.

Luxuries
- maybe even the blame of the line from version control

This is what 12Factor says about logs:
https://12factor.net/logs

# Q4

Assumptions
- that lift is a positive thing, like increased reported customer satisfaction for example. But it could be negative, or neither - something like time spent on app, which could probably go either way.
- that the divisions between the control, A and B are split randomly in a way that has no statistical significance with metric m. But even something innocuous like customer_id may have significance, if customer_id was generated by +=1 incrementing and related to how long this customer has been with us.
- that they are being split in completely different ways than they have been before, so previous A/B testing has flavored their experience before this experiment began
- that the the customers don't have any indication outside of the app that could bias them, like an email to let them know they are in a control group.
- that Variant A and Variant B aren't necessarily opposites, but rather two different directions or even features.
- arbitrarily, that it's not uncommon to introduce features and changes that create 7-8% lifts in either direction, so these lifts are somewhat modest. I just make this assumption because I think that calibration matters when it comes to investing in action.

My first thought is that I'd like a bit more information - specifically, I'd want to know about any changes of distribution in both directions. Is it symmetrical? Or are there outliers that only exist adding positive lift but not negative lift? This information would help us understand a lot more about the uniformity of the distribution.

Ideally, if there are any significant outliers, it would be helpful to get any information at all about their experience.

Variant A is the most significant change. In the short term, we can conclude that the changes in this variant are *not* a good direction for us to go in. But if we could understand why, this variant is probably the best situated to teach us something, as the effect is more uniform than our control and more dramatic than Variant B.

For example, if Variant A individuals were shown a homepage that was a calendar of their upcoming appointments as MAs, the control was a dashboard, and Variant B was a gamified points interface that showed them their progress in accruing appointments against other MAs, then we could hypothesize that the calendar was overwhelming or stressful if it is the first thing seen, but there are still many reasons why that could be. The page itself may be unhelpful, or it may not be the first thing MAs would want to see, it may just be that the other pages create a positive experience that motivates MAs when opening the app, or it may be that the MAs who are shown the dashboard and Gamified pages don't usually discover them without that initial introduction.

Since it's hard to pin these things down, the ideal is really to find a couple outliers for each variant and *watch* them use the app int he closest thing to a natural setting. If we had Hotjar for example, this would be pretty easy, but getting customer perspective paired with the observation is the best possibility.

Similarly, Variant B is a modest improvement, but has a high standard deviation. It would be worth an afternoon to look at the positive and negative lifts outliers of Variant B just to get a sense of what's going on. To me, what this says is that we haven't really found an independent variable that *directly* influences the lift, but maybe one adjacent, since there's so much variability in the Variant B results.

Depending on how significant 1.4% lift is though, if we can continually incrementally improve and just keep a good record of the results of each experiment to consider later, I think greater variability is okay.

If we had the time for user research in this A/B testing cycle though, it would be a good idea to further subdivide Variant B into Variants BA and BB based on our best hypothesis of where the increased variability was coming from (ideally based on user conversation and observation), and that might allow us to
1) Implement the changes in Variant B more safely, knowing we weren't making the experience less stable
2) Get increased lift by potentially cutting out the negative outliers

One last thing I'd like to close with though is that PMF and business-customer interactions are often this set of movements towards a happy target audience. It could be that Variant B, with a greater standard deviation, actually has something to show us about our superusers. Depending on our strategy, it can actually be a *great* business decision to double down on superusers instead of trying to maintain mass appeal (i.e. you can't please everyone). In order to know if that's what's happening here, we'd need to find a way to separate experiential variability with variability in user indentity.

The good news is that if we have any demographic information about these 36,000 users, we should be able to answer that questions pretty easily that way! We can look at
- user location
- timezone
- gender
- age
- years as an MA