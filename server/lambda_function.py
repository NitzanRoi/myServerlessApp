import json
import boto3
from botocore.exceptions import ClientError
import logging
from urllib.parse import parse_qs


class myDB:

    def __init__(self):
        self.dynamodb = None
        self.table = None

    def connect_to_db(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table('userDetails')

    def print_all_table_data(self):
        response = self.table.scan(
            Limit=10,
            Select='ALL_ATTRIBUTES'
        )
        print(response)

    def insert_item(self, email, auth, date, tp):
        response = self.table.put_item(
            Item={
                'email': email,  # string
                'has_authorized': auth,  # boolean
                'registration_date': date,  # epoch time (number)
                'type_of_subscription': tp  # string: 'month' or 'year'
            }
        )
        return response["ResponseMetadata"]["HTTPStatusCode"]

    def read_item(self, email):
        try:
            response = self.table.get_item(
                Key={
                    'email': email
                }
            )
        except ClientError as e:
            return {
                "error_msg": e.response['Error']['Message']
            }
        else:
            return response

    def update_item(self, email, auth, date):
        response = self.table.update_item(
            Key={
                'email': email
            },
            UpdateExpression="SET #at=:auth, #dt=:date",
            ExpressionAttributeNames={
                "#at": "has_authorized",
                "#dt": "registration_date"
            },
            ExpressionAttributeValues={
                ':auth': auth,  # boolean
                ':date': date,  # epoch time
            },
            ReturnValues="UPDATED_NEW"
        )
        return response

    def delete_item(self, email):
        try:
            response = self.table.delete_item(
                Key={
                    'email': email
                }
            )
        except ClientError as e:
            return e.response['Error']['Message']
        else:
            return response

    def handle_main_page(self, headers, email):
        item = self.read_item(email)
        if "error_msg" in item:
            return self.handle_error_case(headers, item["error_msg"])
        else:
            if "Item" in item:
                subscription_type = item["Item"]["type_of_subscription"]
                register_date = item["Item"]["registration_date"]
            else:
                subscription_type = None
                register_date = None
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                "subscription_type": subscription_type,
                "register_date": register_date
            })
        }

    def handle_registration(self, headers, body):
        data = self.insert_item(body["email"][0], body["authorized"][0],
                                body["date"][0], body["type"][0])
        return {
            'statusCode': data,
            'headers': headers,
            'body': json.dumps({
                "message": 'The registration was successful' if data == 200 else "There was a problem"
            })
        }

    def handle_test_case(self, headers, event):
        return {
            "statusCode": 200,
            'headers': headers,
            'body': json.dumps({
                # "event": str(event),
                "message": "body is null"
            })
        }

    def handle_verify(self, headers, body):
        response = self.update_item(
            body["email"][0], body["auth"][0], body["date"][0])
        return {
            "statusCode": 200,
            'headers': headers,
            'body': json.dumps({
                # "response": str(response),
                "message": "item updated"
            })
        }

    def handle_error_case(self, headers, error_msg):
        return {
            "statusCode": 404,
            'headers': headers,
            'body': json.dumps({
                "message": error_msg
            })
        }


def main(event, context):
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    logger.info('## event object ##')
    logger.info(event)
    logger.info("---")

    db_obj = myDB()
    db_obj.connect_to_db()

    headers = {
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
    }

    if event["body"] == None and event["httpMethod"] == "POST":  # for tests
        logger.info("queryStringParameters")
        logger.info(event["queryStringParameters"])
        return db_obj.handle_test_case(headers, event)

    elif event["path"] == '/main' and event["httpMethod"] == "GET":
        logger.info('## /main path ##')
        if "queryStringParameters" in event:
            if "email" in event["queryStringParameters"]:
                email = event["queryStringParameters"]["email"]
                return db_obj.handle_main_page(headers, email)
            else:
                return db_obj.handle_error_case(headers, "no email parameter")
        else:
            return db_obj.handle_error_case(headers, "no queryStringParameters")

    elif event["path"] == '/register' and event["httpMethod"] == "POST":
        logger.info('## /register path ##')
        event_body = parse_qs(event["body"])
        return db_obj.handle_registration(headers, event_body)

    elif event["path"] == '/verify' and event["httpMethod"] == "POST":
        logger.info('## /verify path ##')
        event_body = parse_qs(event["body"])
        return db_obj.handle_verify(headers, event_body)

    else:
        return db_obj.handle_error_case(headers, "path not found")
