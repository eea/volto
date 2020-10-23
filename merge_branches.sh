#!/bin/sh

set -x

git remote add volto https://github.com/plone/volto.git
git fetch --all
git pull

git merge volto/master
git merge volto/404_router
git merge volto/multi_selected_copy
