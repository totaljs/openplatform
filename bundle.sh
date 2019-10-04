mkdir -p .bundle/

cd .bundle
cp -a ../controllers/ controllers
cp -a ../definitions/ definitions
cp -a ../modules/ modules
cp -a ../public/ public
cp -a ../resources/ resources
cp -a ../schemas/ schemas
cp -a ../views/ views

total bundle openplatform.bundle
cp openplatform.bundle ../openplatform.bundle
cd ..

rm -rf .bundle
echo "DONE"