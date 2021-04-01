mkdir -p .bundle/

cd .bundle
mkdir resources
cp -a ../controllers/ controllers
cp -a ../definitions/ definitions
cp -a ../modules/ modules
cp -a ../schemas/ schemas
cp -a ../public/ public
cp -a ../views/ views
cp -a ../resources/default.resource resources/default.resource
cp -a ../updates/ updates
cp -a ../guest.json guest.json
mv controllers/api.js controllers/op-api.js
mv controllers/default.js controllers/op-default.js

# Flat file database
# mv definitions/database-bk.js definitions/database.js

cd definitions
for f in *.js; do mv "$f" "`echo op-$f`"; done

cd ../schemas
for f in *.js; do mv "$f" "`echo op-$f`"; done

cd ..

total4 --bundle ../openplatform.bundle
# cp openplatform.package ../openplatform@4.bundle

cd ..
rm -rf .bundle
echo "DONE"