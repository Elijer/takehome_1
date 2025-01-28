# Challenge
- Or in [./Challenge.md](./Challenge.md)

Questions I should be able to answer -
Is the compute Sort running every time? Why or why not?


# Hints
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- https://codepen.io/bitbug/pen/wvmaXmQ
- Scrolling gotcha - Intersections don't fire if the element is already in viewport before intersections are polled
- https://css-tricks.com/almanac/properties/f/flex-grow/


# Computing legitimacy
There is part of this challenge that I shrugged out of - IRL, we'd be fetching data, a virtually unlimited amount of it, and we'd probably do so in response to scrolling.

Right now we are RENDERING data in response to scrolling, but we aren't changing the `data` ref that gets generated right off the bat. This means that we are able to sort all of the data from the get go, a single time.

We use the `computed` hook to memoize the return value of that function and we never have to do it again! This is great. This is why, no matter how far I scroll, the amount of time it takes to sort the data I have is roughly the same range of time.

This would require an extra step if we were fetching new data every time.

If we were fetching new data every time, we'd have to redo the function in `compute`, and as the user scrolled more and more, that function would get slower and slower as it sorted more and more data. Let's say we're IG, and their 40 minutes into a doom-scroll. On the humanitarian front it may be be a feature not a bug that rendering would slow down because it may remind them that they have been scrolling too long, but to the shittification department at IG this is an issue for user experience continuity.

What we really have to do is something like create a ref for memoizing the sorting process up to index 'n' so that we can save and reuse our work and concatenate the new sorted results we got.

It might be as simple as making the `results` array a ref.