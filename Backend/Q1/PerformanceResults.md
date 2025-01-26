The results are on benchmarks for large amounts of seeded documents
used as comparisonsbetween the table building speed of the functions in:
-getTableData.ts
-getTableDataAgg.ts

100K records to look through:
this ratio of better than 2:1 consistent across cases
non-agg: 435-501.80ms
agg: 155-229.44ms

1m records (19s)
non-agg: 4.00s
agg: 2.85s

---w/ index on patient_id:
no significant difference
non-agg: 3.81
agg: 2.77s

--w/ index on field_nm
non-agg: no change
agg: slower

--lower possible ids, 500K results
agg: 1.39 seconds
non-agg: 1.97