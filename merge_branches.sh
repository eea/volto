#!/bin/sh

set -x

git remote add volto https://github.com/plone/volto.git
git fetch --all
git pull

git merge volto/master
git merge volto/export_components
git merge volto/eea-dx-fields-validation
git merge volto/eea-dx-cpanel-layout
git merge volto/eea-fix-custom-action-headers
git merge volto/form_context_clean_breaking_with_hoc
git merge volto/addons_customize
git merge volto/safe_apply_config
git merge volto/object-widget-final
git merge volto/upload_content

# Already merged to Volto master
# git merge --no-ff volto/default-block-rebased
# git merge --no-ff volto/fix_toolbar_ssr
# git merge volto/wysiwyg_desc_styling
# git merge volto/disable_submit
# git merge volto/fix_querystring_ssr_edit
# git merge volto/fix_querystring_missing_value
# git merge volto/fix_querystring_child_warning
# git merge tiberiuichim/navigation-refactoring
# git merge volto/eea-controlpanel-dx
# git merge origin/eea-default-blocks
# git merge volto/separate_less_loader
# git merge volto/eea-fix-get-blocks
# git merge volto/internalApiPath_in_url_helpers
