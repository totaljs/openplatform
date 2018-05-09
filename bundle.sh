mkdir -p .bundle/

cd .bundle
cp -a ../controllers/ controllers
cp -a ../definitions/ definitions
cp -a ../databases/ databases
cp -a ../models/ models
cp -a ../public/ public
cp -a ../views/ views
cp ../workflows workflows
mv controllers/api.js controllers/op-api.js
mv controllers/default.js controllers/op-default.js

cd definitions
for f in *.js; do mv "$f" "`echo op-$f`"; done

cd ../models
for f in *.js; do mv "$f" "`echo op-$f`"; done

cd ..
tpm create openplatform.package
cp openplatform.package ../openplatform.bundle

cd ..
rm -rf .bundle
echo "DONE"