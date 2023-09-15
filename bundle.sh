mkdir -p .bundle

cd .bundle
cp -a ../controllers/ controllers
cp -a ../definitions/ definitions
cp -a ../plugins/ plugins
cp -a ../public/ public
cp -a ../resources/ resources
cp -a ../schemas/ schemas
cp -a ../views/ views
cp -a ../database.sql database.sql

# cd ..
total4 --bundle app.bundle
cp app.bundle ../app.bundle

cd ..
rm -rf .bundle
echo "DONE"