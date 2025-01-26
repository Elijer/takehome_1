# Database setup
One option to set up a MongoDB database is to use MongoDB Atlas which is free and pretty ast.

But it's dabatably even easier just to pull and run a local MongoDB image. To summarize the steps outlined [here](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-community-with-docker/):

```ts
//1.
docker pull mongodb/mongodb-community-server:latest

//2.
docker run --name mongodb -p 27017:27017 -d mongodb/mongodb-community-server:latest

//3. 
docker container ls
```

Install > [Compass. The GUI for MongoDB](https://www.mongodb.com/products/tools/compass) to interact with it easily. If you use VScode, the MongoDB extension also lets you do this, although Compass is very helpful when experimenting with potential aggregations.

![image](https://thornberry-obsidian-general.s3.us-east-2.amazonaws.com/attachments/80256d9d555ee83bfd860b3680638d44.png)
> MongoDB GUI interface

To seed data, check out the [seeder.ts file](./Q1/src/seeder.ts). It used the npm package `faker` like this:

```ts
const randomName = faker.person.fullName(); // Willie Bahringer
const randomEmail = faker.internet.email(); // Tomasa_Ferry14@hotmail.com
```

to seed the data we need.