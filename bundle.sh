mkdir -p .bundle/

cd .bundle
cp -a ../controllers/ controllers
cp -a ../definitions/ definitions
cp -a ../databases/ databases
cp -a ../schemas/ schemas
cp -a ../public/ public
cp -a ../resources/ resources
cp -a ../views/ views
mv controllers/api.js controllers/op-api.js
mv controllers/default.js controllers/op-default.js

# Flat file database
# mv definitions/database-bk.js definitions/database.js

cd definitions
for f in *.js; do mv "$f" "`echo op-$f`"; done

cd ../schemas
for f in *.js; do mv "$f" "`echo op-$f`"; done

cd ..

mv definitions/op-database.js definitions/database.js
rm definitions/op-database-mongodb-bk.js

tpm create openplatform.package
cp openplatform.package ../openplatform.bundle
# cp openplatform.package ../openplatform@4.bundle

cd ..
rm -rf .bundle
echo "DONE"