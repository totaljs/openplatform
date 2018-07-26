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

cd definitions
for f in *.js; do mv "$f" "`echo op-$f`"; done

cd ../schemas
for f in *.js; do mv "$f" "`echo op-$f`"; done

cd ..
tpm create openplatform.package
cp openplatform.package ../openplatform.bundle

cd ..
rm -rf .bundle
echo "DONE"