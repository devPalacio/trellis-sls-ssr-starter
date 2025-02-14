# Create User's Account

Create a new user in the database if it does not already exist.

**URL** : `/api/signup/`

**Method** : `POST`

**Auth required** : NO

**Permissions required** : None

**Data constraints**

Must provide the required user info.


**Data example**

- [Schema](../../src/schema/create_user.json)
- [Example](../../src/tests/test-utils/data_factories.js): userfactory.correct

## Success Response

**Condition** : If everything is OK and a User didn't already exist.

**Code** : `201 CREATED`

**Content example**

```json
{
  "message": "response message",
}
```

## Error Responses

**Condition** : If Account already exists for User.

**Code** : `403 FORBIDDEN`

**Content example**

```json
{
    "email": [
        "This email already exists."
    ]
}
```

### Or

**Condition** : If fields are missed.

**Code** : `400 BAD REQUEST`

**Content example**

```json
{
    "email": [
        "This field is required."
    ]
}
```